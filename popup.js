// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const classScheduleUrl = "https://cmsweb.cms.sjsu.edu/psc/CSJPRD_1/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL";

let importClassesButton = document.getElementById('importClassesButton');

importClassesButton.onclick = (element) => {
  let color = element.target.value;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
        tabs[0].id,
        {
          file: 'content.js'
        });
  });
};

let classScheduleButton = document.getElementById('classScheduleButton');
classScheduleButton.onclick = (element) => {
  chrome.tabs.query({'active': true}, (tabs) => {
    chrome.tabs.update(tabs[0].id, {url: classScheduleUrl});
  });
};
