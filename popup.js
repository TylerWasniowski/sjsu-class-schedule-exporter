// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const CLASS_SCHEDULE_URL = "https://cmsweb.cms.sjsu.edu/psc/CSJPRD/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL";

let classScheduleButton = document.getElementById('classScheduleButton');
classScheduleButton.onclick = (element) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.update(tabs[0].id, {url: CLASS_SCHEDULE_URL});
  });
};
