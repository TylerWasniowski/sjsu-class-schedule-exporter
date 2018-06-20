(() => {
    const importClassesText = "Import Classes";
    const importClassesButtonId = "importClassesButton";


    const pageContainerSelector = "#win1divPAGECONTAINER";
    
    const classesContainerSelector = "div[id ^= 'win1divSTDNT_ENRL_SSV2\\24 ']";

    const classContainerSelector = "div[id ^= 'win1divDERIVED_REGFRM1_DESCR20\\24 ']";
    const classNameSelector = "table > tbody > tr > td";

    const componentSelector = "table[id ^= 'CLASS_MTG_VW\\24 scroll\\24 '] > tbody > tr > td > table > tbody > tr";
    const componentNameSelector = "div[id ^= 'win1divMTG_COMP\\24 '] > span";
    const daysAndTimesSelector = "div[id ^= 'win1divMTG_SCHED\\24 '] > span";
    const roomSelector = "div[id ^= 'win1divMTG_LOC\\24 '] > span";
    const startAndEndDatesSelector = "div[id ^= 'win1divMTG_DATES\\24 '] > span";


    attachButton();    
    // Attach button again if page changes.
    const observer = new MutationObserver(attachButton);
    observer.observe(
        document.querySelector(pageContainerSelector),
        { childList: true }
    );

    function attachButton() {
        if (!document.querySelector(classContainerSelector))
            return;
        
        const classesContainer = document.querySelector(classesContainerSelector);

        const importClassesButton = document.createElement("button");
        const importClassesTextNode = document.createTextNode(importClassesText);

        importClassesButton.append(importClassesTextNode);
        importClassesButton.id = importClassesButtonId;

        importClassesButton.onclick = () => {
            console.log(findClasses());
            return false;
        };

        classesContainer.prepend(importClassesButton);
    }

    function findClasses() {
        let classes = [];

        document.querySelectorAll(classContainerSelector)
        .forEach(
            (classContainer) => {
                const className = classContainer.querySelector(classNameSelector).innerText;
                
                [].slice.call(classContainer.querySelectorAll(componentSelector), 1)
                .forEach(
                    (component) => {
                        const componentName = component.querySelector(componentNameSelector).innerText;
                        
                        const daysAndTimesArray = component.querySelector(daysAndTimesSelector)
                            .innerText
                            .split(" ");
                        const daysString = daysAndTimesArray[0];
                        const startTime = daysAndTimesArray[1];
                        const endTime = daysAndTimesArray[3];
                        
                        const days = {
                            sunday: daysString.includes("Su"),
                            monday: daysString.includes("Mo"),
                            tuesday: daysString.includes("Tu"),
                            wednesday: daysString.includes("We"),
                            thursday: daysString.includes("Th"),
                            friday: daysString.includes("Fr"),
                            saturday: daysString.includes("Sa")
                        }

                        const room = component.querySelector(roomSelector).innerText;

                        const startAndEndDatesArray = component.querySelector(startAndEndDatesSelector)
                            .innerText
                            .split(" - ");
                        const startDateString = startAndEndDatesArray[0];
                        const endDateString = startAndEndDatesArray[1];

                        const startDate = new Date(startDateString);
                        const endDate = new Date(endDateString);

                        classes.push({
                            className: className,
                            componentName: componentName,
                            days: days,
                            startTime: startTime,
                            endTime: endTime,
                            room: room,
                            startDate: startDate,
                            endDate: endDate
                        });
                    }
        )});

        return classes;
    }
})();