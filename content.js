(() => {
    const classDivSelector = "div[id ^= 'win1divDERIVED_REGFRM1_DESCR20\\24 ']";
    const classNameSelector = "table > tbody > tr > td";

    const componentSelector = "table[id ^= 'CLASS_MTG_VW\\24 scroll\\24 '] > tbody > tr > td > table > tbody > tr";
    const componentNameSelector = "div[id ^= 'win1divMTG_COMP\\24 '] > span";
    const daysAndTimesSelector = "div[id ^= 'win1divMTG_SCHED\\24 '] > span";
    const roomSelector = "div[id ^= 'win1divMTG_LOC\\24 '] > span";
    const startAndEndDatesSelector = "div[id ^= 'win1divMTG_DATES\\24 '] > span";

    console.log(
        findClasses()
    );

    function findClasses() {
        let classes = [];

        document.querySelectorAll(classDivSelector)
        .forEach(
            (classDiv) => {
                const className = classDiv.querySelector(classNameSelector).innerText;
                
                [].slice.call(classDiv.querySelectorAll(componentSelector), 1)
                .forEach(
                    (component) => {    
                        console.log(component);
                        let componentName = component.querySelector(componentNameSelector).innerText;
                        
                        let daysAndTimesArray = component.querySelector(daysAndTimesSelector)
                            .innerText
                            .split(" ");
                        let days = daysAndTimesArray[0];
                        let startTime = daysAndTimesArray[1];
                        let endTime = daysAndTimesArray[3];

                        let room = component.querySelector(roomSelector).innerText;

                        let startAndEndDatesArray = component.querySelector(startAndEndDatesSelector)
                            .innerText
                            .split(" - ");
                        let startDate = startAndEndDatesArray[0];
                        let endDate = startAndEndDatesArray[1];

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