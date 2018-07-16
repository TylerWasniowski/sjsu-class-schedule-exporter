(() => {
    const EXPORT_CLASSES_BUTTON_TEXT = "Export Classes";
    const EXPORT_CLASSES_BUTTON_ID = "exportClassesButton";

    const CLASSES_IFRAME_SELECTOR = "#ptifrmtgtframe";

    const PAGE_CONTAINER_SELECTOR = "div[id *= 'divPAGECONTAINER']";

    const SCHEDULE_TITLE_SELECTOR = "#DERIVED_REGFRM1_SSR_STDNTKEY_DESCR\\24 11\\24 ";
    
    const CLASSES_CONTAINER_SELECTOR = "div[id *= 'divSTDNT_ENRL_SSV2\\24 ']";

    const CLASS_CONTAINER_SELECTOR = "div[id *= 'divDERIVED_REGFRM1_DESCR20\\24 ']";
    const CLASS_NAME_SELECTOR = "table > tbody > tr > td";

    const COMPONENT_SELECTOR = "table[id *= 'CLASS_MTG_VW\\24 scroll\\24 '] > tbody > tr > td > table > tbody > tr";
    const CLASS_NUMBER_SELECTOR = "div[id *= 'divDERIVED_CLS_DTL_CLASS_NBR\\24 '] > span";
    const SECTION_SELECTOR = "div[id *= 'divMTG_SECTION\\24 '] > span";
    const COMPONENT_NAME_SELECTOR = "div[id *= 'divMTG_COMP\\24 '] > span";
    const DAYS_AND_TIMES_SELECTOR = "div[id *= 'divMTG_SCHED\\24 '] > span";
    const ROOM_SELECTOR = "div[id *= 'divMTG_LOC\\24 '] > span";
    const INSTRUCTOR_SELECTOR = "div[id *= 'divDERIVED_CLS_DTL_SSR_INSTR_LONG\\24 '] > span";
    const START_AND_END_DATES_SELECTOR = "div[id *= 'divMTG_DATES\\24 '] > span";

    const iframe = document.querySelector(CLASSES_IFRAME_SELECTOR);
    if (iframe)
        iframe.addEventListener('load', () => persistButton(iframe.contentWindow.document));
    else
        persistButton(document);

    // Attaches button again if page changes
    function persistButton(doc) {
        const page = doc.querySelector(PAGE_CONTAINER_SELECTOR);
        attachButton(page);
        const observer = new MutationObserver(() => attachButton(page));
        observer.observe(page, { childList: true });
    }

    function attachButton(page) {
        if (!page.querySelector(CLASS_CONTAINER_SELECTOR))
            return;
        
        const classesContainer = page.querySelector(CLASSES_CONTAINER_SELECTOR);

        const exportClassesButton = document.createElement("button");
        const exportClassesTextNode = document.createTextNode(EXPORT_CLASSES_BUTTON_TEXT);

        exportClassesButton.append(exportClassesTextNode);
        exportClassesButton.id = EXPORT_CLASSES_BUTTON_ID;

        // Returns false to prevent refresh.
        exportClassesButton.onclick = () => {
            exportSchedule(page);
            return false;
        };

        classesContainer.prepend(exportClassesButton);
    }

    function findClasses(page) {
        let classes = [];

        page.querySelectorAll(CLASS_CONTAINER_SELECTOR)
        .forEach(
            (classContainer) => {
                const className = classContainer.querySelector(CLASS_NAME_SELECTOR).innerText;
                
                [].slice.call(classContainer.querySelectorAll(COMPONENT_SELECTOR), 1)
                .forEach(
                    (component) => {
                        const componentName = component.querySelector(COMPONENT_NAME_SELECTOR).innerText;
                        
                        const classNumber = component.querySelector(CLASS_NUMBER_SELECTOR).innerText;

                        const section = component.querySelector(SECTION_SELECTOR).innerText;

                        const daysAndTimesArray = component
                            .querySelector(DAYS_AND_TIMES_SELECTOR)
                            .innerText
                            .split(" ");
                        const daysString = daysAndTimesArray[0];
                        const startTime = getMilitaryTime(daysAndTimesArray[1]);
                        const endTime = getMilitaryTime(daysAndTimesArray[3]);

                        const startAndEndDatesArray = component
                            .querySelector(START_AND_END_DATES_SELECTOR)
                            .innerText
                            .split(" - ");
                        const startDate = startAndEndDatesArray[0];
                        const endDate = startAndEndDatesArray[1];

                        const days = {
                            sunday: daysString.includes("Su"),
                            monday: daysString.includes("Mo"),
                            tuesday: daysString.includes("Tu"),
                            wednesday: daysString.includes("We"),
                            thursday: daysString.includes("Th"),
                            friday: daysString.includes("Fr"),
                            saturday: daysString.includes("Sa")
                        }

                        const room = component.querySelector(ROOM_SELECTOR).innerText;

                        const instructor = component.querySelector(INSTRUCTOR_SELECTOR).innerText;


                        classes.push({
                            classNumber: classNumber,
                            section: section,
                            className: className,
                            componentName: componentName,
                            days: days,
                            startTime: startTime,
                            endTime: endTime,
                            startDate: startDate,
                            endDate: endDate,
                            room: room,
                            instructor: instructor,
                        });
                    }
        )});

        return classes;
    }

    // Sends the classes to extension background for exporting.
    function exportSchedule(page) {
        const schedule =
        {
            semester: getSemester(page),
            classes: findClasses(page)
        }
        console.log("Sending export message with schedule:");
        console.log(schedule);

        chrome.runtime.sendMessage(
            { schedule: schedule },
            (response) => {
                console.log(response);
        });
    }

    function getSemester(page) {
        return page
            .querySelector(SCHEDULE_TITLE_SELECTOR)
            .innerText
            .split(' | ', 1)[0]
            .replace(' ', '')
            .toLowerCase();
    }

    function getMilitaryTime(timeString) {
        const timeArr = timeString.split(':');
    
        const hour = parseInt(timeArr[0]);
        const minute = timeArr[1].substring(0, timeArr[1].length - 2);

        if (timeString.includes('PM'))
            return ((hour % 12) + 12) + ':' + minute;
        else if (timeString.includes('AM'))
            return ((hour % 12) + ':' + minute).padStart(5, '0');
        else
            return hour + ':' + minute;
    }
})();