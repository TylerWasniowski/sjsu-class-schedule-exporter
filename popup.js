// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const classScheduleUrl = "https://cmsweb.cms.sjsu.edu/psc/CSJPRD_1/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL?Page=SSR_SSENRL_LIST&Action=A&TargetFrameName=None&PortalActualURL=https%3a%2f%2fcmsweb.cms.sjsu.edu%2fpsc%2fCSJPRD_1%2fEMPLOYEE%2fSA%2fc%2fSA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL%3fPage%3dSSR_SSENRL_LIST%26Action%3dA%26TargetFrameName%3dNone&PortalContentURL=https%3a%2f%2fcmsweb.cms.sjsu.edu%2fpsc%2fCSJPRD_1%2fEMPLOYEE%2fSA%2fc%2fSA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL&PortalContentProvider=SA&PortalCRefLabel=My%20Class%20Schedule&PortalRegistryName=EMPLOYEE&PortalServletURI=https%3a%2f%2fcmsweb.cms.sjsu.edu%2fpsp%2fCSJPRD_1%2f&PortalURI=https%3a%2f%2fcmsweb.cms.sjsu.edu%2fpsc%2fCSJPRD_1%2f&PortalHostNode=SA&NoCrumbs=yes&PortalKeyStruct=yes";
const classDivSelector = "div[id^='win1divDERIVED_REGFRM1_DESCR20\\\\24 ']";

let changeColor = document.getElementById('changeColor');
chrome.storage.sync.get('color', function(data) {
  changeColor.style.backgroundColor = data.color;
  changeColor.setAttribute('value', data.color);
});

changeColor.onclick = function(element) {
  let color = element.target.value;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
        tabs[0].id,
        {code: '\
        console.log(\
          document.querySelectorAll("' + classDivSelector + '")[0]\
          .querySelector("table > tbody > tr > td")\
          .innerText\
        );'});
  });
};

let classScheduleButton = document.getElementById('classScheduleButton');
classScheduleButton.onclick = function(element) {
  chrome.tabs.query({'active': true}, function(tabs) {
    chrome.tabs.update(tabs[0].id, {url: classScheduleUrl});
  });
}
