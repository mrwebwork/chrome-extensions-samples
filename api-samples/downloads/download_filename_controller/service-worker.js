function matches(rule, item) {
  if (rule.matcher == 'hostname') {
    const link = new URL(item.url);
    const host = rule.match_param.indexOf(':') < 0 ? link.hostname : link.host;
    return (
      host.indexOf(rule.match_param.toLowerCase()) ==
      host.length - rule.match_param.length
    );
  }
  if (rule.matcher == 'default') return item.filename == rule.match_param;
  if (rule.matcher == 'url-regex')
    return new RegExp(rule.match_param).test(item.url);
  if (rule.matcher == 'default-regex')
    return new RegExp(rule.match_param).test(item.filename);
  return false;
}

chrome.downloads.onDeterminingFilename.addListener(function (item, __suggest) {
  function suggest(filename, conflictAction) {
    __suggest({ filename: filename, conflictAction: conflictAction });
  }
  chrome.storage.local.get('rules').then(({ rules }) => {
    if (!rules) {
      rules = [];
      chrome.storage.local.set({ rules });
    }
    for (let rule of rules) {
      if (rule.enabled && matches(rule, item)) {
        if (rule.action == 'overwrite') {
          suggest(item.filename, 'overwrite');
        } else if (rule.action == 'prompt') {
          suggest(item.filename, 'prompt');
        }
        return;
      }
    }
    suggest(item.filename);
  });

  // return true to indicate that suggest() was called asynchronously
  return true;
});