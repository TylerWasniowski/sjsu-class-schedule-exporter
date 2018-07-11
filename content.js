(() => {
    const EXPORT_CLASSES_BUTTON_TEXT = "Export Classes";
    const EXPORT_CLASSES_BUTTON_ID = "exportClassesButton";


    const PAGE_CONTAINER_SELECTOR = "#win1divPAGECONTAINER";
    
    const CLASSES_CONTAINER_SELECTOR = "div[id ^= 'win1divSTDNT_ENRL_SSV2\\24 ']";

    const CLASS_CONTAINER_SELECTOR = "div[id ^= 'win1divDERIVED_REGFRM1_DESCR20\\24 ']";
    const CLASS_NAME_SELECTOR = "table > tbody > tr > td";

    const COMPONENT_SELECTOR = "table[id ^= 'CLASS_MTG_VW\\24 scroll\\24 '] > tbody > tr > td > table > tbody > tr";
    const CLASS_NUMBER_SELECTOR = "div[id ^= 'win1divDERIVED_CLS_DTL_CLASS_NBR\\24 '] > span";
    const SECTION_SELECTOR = "div[id ^= 'win1divMTG_SECTION\\24 '] > span";
    const COMPONENT_NAME_SELECTOR = "div[id ^= 'win1divMTG_COMP\\24 '] > span";
    const DAYS_AND_TIMES_SELECTOR = "div[id ^= 'win1divMTG_SCHED\\24 '] > span";
    const ROOM_SELECTOR = "div[id ^= 'win1divMTG_LOC\\24 '] > span";
    const INSTRUCTOR_SELECTOR = "div[id ^= 'win1divDERIVED_CLS_DTL_SSR_INSTR_LONG\\24 '] > span";
    const FIRST_AND_LAST_DATES_SELECTOR = "div[id ^= 'win1divMTG_DATES\\24 '] > span";


    attachButton();
    // Attach button again if page changes.
    const observer = new MutationObserver(attachButton);
    observer.observe(
        document.querySelector(PAGE_CONTAINER_SELECTOR),
        { childList: true }
    );

    function attachButton() {
        if (!document.querySelector(CLASS_CONTAINER_SELECTOR))
            return;
        
        const classesContainer = document.querySelector(CLASSES_CONTAINER_SELECTOR);

        const exportClassesButton = document.createElement("button");
        const exportClassesTextNode = document.createTextNode(EXPORT_CLASSES_BUTTON_TEXT);

        exportClassesButton.append(exportClassesTextNode);
        exportClassesButton.id = EXPORT_CLASSES_BUTTON_ID;

        // Returns false to prevent refresh.
        exportClassesButton.onclick = () => {
            exportClasses();
            return false;
        };

        classesContainer.prepend(exportClassesButton);
    }

    function findClasses() {
        let classes = [];

        document.querySelectorAll(CLASS_CONTAINER_SELECTOR)
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

                        const firstAndLastDatesArray = component
                            .querySelector(FIRST_AND_LAST_DATES_SELECTOR)
                            .innerText
                            .split(" - ");
                        const firstDate = firstAndLastDatesArray[0];
                        const lastDate = firstAndLastDatesArray[1];

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
                            firstDate: firstDate,
                            lastDate: lastDate,
                            room: room,
                            instructor: instructor,
                        });
                    }
        )});

        return classes;
    }

    // Sends the classes to extension background for exporting.
    function exportClasses() {
        console.log("Sending export message with classes:");
        console.log(findClasses());

        chrome.runtime.sendMessage(
            {classes: findClasses()},
            (response) => {
                console.log(response);
        });
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