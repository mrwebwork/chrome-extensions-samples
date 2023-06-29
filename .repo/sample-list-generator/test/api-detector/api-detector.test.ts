import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import { getApiType, extractApiCalls } from '../../src/libs/api-detector';

describe('API Detector', function () {
  beforeEach(function () {
    sinon.reset();
  });

  describe('extractApiCalls()', function () {
    it('should return correct api list for sample file (normal)', async function () {
      const file = Buffer.from(
        `
        let a = 1;
        let b = chrome.action.getBadgeText();
        let c = chrome.action.setBadgeText(a);

        chrome.action.onClicked.addListener(function (tab) {
          console.log('clicked');
        });

        alert(chrome.contextMenus.ACTION_MENU_TOP_LEVEL_LIMIT)
      `,
        'utf8'
      );
      const result = await extractApiCalls(file);
      assert.deepEqual(result, {
        event: ['action.onClicked'],
        method: ['action.getBadgeText', 'action.setBadgeText'],
        property: ['contextMenus.ACTION_MENU_TOP_LEVEL_LIMIT']
      });
    });

    it('should return correct api list for sample file (async)', async function () {
      const file = Buffer.from(
        `
        let a = 1;
        let b = await chrome.action.getBadgeText();
        await chrome.action.setBadgeText(a);
      `,
        'utf8'
      );
      const result = await extractApiCalls(file);
      assert.deepEqual(result, {
        method: ['action.getBadgeText', 'action.setBadgeText']
      });
    });

    it('should return correct api list for sample file (special case)', async function () {
      const file = Buffer.from(
        `
        let a = 1;
        let b = await chrome.system.cpu.getInfo();
        chrome.devtools.network.onRequestFinished.addListener(
          function(request) {
            if (request.response.bodySize > 40*1024) {
              chrome.devtools.inspectedWindow.eval(
                  'console.log("Large image: " + unescape("' +
                  escape(request.request.url) + '"))');
            }
          }
        );
      `,
        'utf8'
      );

      const result = await extractApiCalls(file);
      assert.deepEqual(result, {
        event: ['devtools_network.onRequestFinished'],
        method: ['system_cpu.getInfo', 'devtools_inspectedWindow.eval']
      });
    });
  });

  describe('getApiType()', function () {
    it('should return correct type of api in normal case', function () {
      let apiType = getApiType('action', 'getBadgeText');
      assert.equal(apiType, 'method');
    });

    it('should return correct type of api in special case', function () {
      let apiType = getApiType('devtools.network', 'onNavigated');
      assert.equal(apiType, 'event');
    });

    it('should return unknown when api not found', function () {
      const consoleCall = sinon.stub(console, 'log');

      let apiType = getApiType('action', '123');
      assert.equal(apiType, 'unknown');
      sinon.assert.calledOnceWithMatch(
        consoleCall,
        'api not found',
        'action',
        '123'
      );
    });
  });
});