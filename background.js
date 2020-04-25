var test = {test_title: "", tasks: [], transfer_results: {transfer_type: "email", email: "", url: ""}};
var currentState = {state: "", task: null, startTime: null};
var stored_test = {};
var tester_id = "";
var stored_task = {
    id: null,
    instruction: "",
    time: null,
    time_limit_visible: false,
    target: {target_type: "url", target_urls: [], target_css_ids: [], message: null}
};
var test_results = [];
var savedData = {};
savedData.task_completion_array = new Array(test.tasks.length).fill(false);
var activeTest = false;

/* standardize for all browsers */
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

/* communicate with the content script */
function sendToContentScript(message, callback) {
    var callbackfunction = function (response) {
        if (chrome.runtime.lastError) {
            console.log("Whoops.. " + chrome.runtime.lastError.message);
            if(window.browser.runtime.lastError.message === "Could not establish connection. Receiving end does not exist."){
                window.browser.runtime.sendMessage({reason: "displayMessage",mesTitle: "An Unexpected Error occurred!",
                    mesBody: "Please try again after reopening the browser plugin and reloading this website!", mesTime: -1}, function (response) {});
                currentState.state = "takeTest";
            }
        } else {
            callback(response);
        }
    };
    window.browser.tabs.getSelected(null, function (tab) {
        if (tab.id >= 0) {
            window.browser.tabs.sendRequest(tab.id, message, callbackfunction);

        } else {
            window.browser.runtime.sendMessage({reason: "displayMessage",mesTitle: "An Unexpected Error occurred!",
                mesBody: "Please try again after reopening the browser plugin!", mesTime: 5000}, function (response) {});
        }
    });
}

/* save data when the users changes the page & reloads the content script */
function reinstateListener(tabId, changeInfo, tab) {
    if (savedData.task === undefined) {
        return;
    }
    let taskID = parseInt(savedData.task.id);
    let curTask = 0;
    for (let i = 0; i < savedData.task_completion_array.length; i++) {
        if (savedData.task_completion_array[i] === false) {
            curTask = i;
            break;
        }
    }
    /*removed && taskID === curTask*/
    if (changeInfo.status === 'complete'  && activeTest && currentState.state !== "end" ) {

        sendToContentScript({
            messageType: "reinstate",
            task: test.tasks[curTask],
            startTime : savedData.startTime,
            timeOffset: savedData.timeOffset,
            tester_id: savedData.tester_id,
            task_completion_array: savedData.task_completion_array
        }, function (response) {
            if (response !== null && response !== undefined) {
                if(response.task === -3){
                    if(activeTest && !savedData.task_completion_array[response.currenttask.id]){
                        content_script_callback(response);
                    }
                }
            }
        });
    }
}

window.browser.tabs.onUpdated.addListener(reinstateListener);
/* handle the callback */
function content_script_callback(response) {
    if (response !== null && response !== undefined) {
        let task_id = response.task;
        /* when the last task is complete */
        if (task_id >= test.tasks.length && activeTest) {
            currentState.state = "end";
            currentState.task = null;
            currentState.startTime = null;
            savedData.task_completion_array = response.task_completion_array;
            $("#takeTest_cancel").css("display", "none");
            $("#backButton").click();
            activeTest = false;
            sendToContentScript({
                messageType: "end",
                testResults: test_results,
                tasks: test.tasks,
                first: true,
                transfer_type: test.transfer_results.transfer_type
            }, function (response) {
                content_script_callback(response);
            });
        }
        /* handling the test result display & downloading/sending the result */
        else if (task_id === -1) {
            currentState = {state: "", task: null, startTime: null};
            $("#takeTest_cancel").css("display", "none");
            var test_results_compressed = [];
            for (let i = 0; i < test_results.length; i++) {
                test_results_compressed.push({
                    task_id: test_results[i].task_id,
                    timeTaken: test_results[i].timeTaken,
                    success: test_results[i].success,
                    comment: test_results[i].comment
                });
            }
            let result = {test: test, tester_id: tester_id, results: test_results_compressed};
            let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result));
            if (response.returnVal === "download") {
                let exportFileDefaultName = (test.test_title === "" ? "test_result" : test.test_title + "_result") + '.json';
                let linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                sendToContentScript({
                    messageType: "end",
                    testResults: test_results,
                    tasks: test.tasks,
                    first: false,
                    transfer_type: test.transfer_results.transfer_type
                }, function (response) {
                    content_script_callback(response);
                });
            } else if (response.returnVal === "send") {
                if (test.transfer_results.transfer_type === "email") {
                    $.ajax({
                        url: 'http://homepage-allupp.bplaced.net/test/usabilityTest/sendmail.php',
                        type: 'post',
                        success: function (data) {
                            sendToContentScript({
                                messageType: "end", testResults: test_results, tasks: test.tasks,
                                first: false, transfer_type: test.transfer_results.transfer_type, success: true
                            }, function (response) {
                                content_script_callback(response);
                            });
                        },
                        error: function (request, status, error) {
                            sendToContentScript({
                                messageType: "end", testResults: test_results, tasks: test.tasks,
                                first: false, transfer_type: test.transfer_results.transfer_type, success: false
                            }, function (response) {
                                content_script_callback(response);
                            });
                        },
                        data: {
                            email: test.transfer_results.email,
                            test_title: test.test_title,
                            tester_id: result.tester_id,
                            result: JSON.stringify(result)
                        }
                    });
                } else if (test.transfer_results.transfer_type === "url") {
                    $.ajax({
                        url: test.transfer_results.url,
                        type: 'post',
                        success: function (data) {
                            sendToContentScript({
                                messageType: "end", testResults: test_results, tasks: test.tasks,
                                first: false, transfer_type: test.transfer_results.transfer_type, success: true
                            }, function (response) {
                                content_script_callback(response);
                            });

                        },
                        error: function (request, status, error) {
                            sendToContentScript({
                                messageType: "end", testResults: test_results, tasks: test.tasks,
                                first: false, transfer_type: test.transfer_results.transfer_type, success: false
                            }, function (response) {
                                content_script_callback(response);
                            });
                        },
                        data: {test_title: test.test_title, tester_id: result.tester_id, result: JSON.stringify(result)}
                    });
                }

            } else {
                tester_id = "";
                //window.browser.tabs.onUpdated.removeListener(reinstateListener);
            }
            activeTest = false;
        }
        /* handling page unload */
        else if (task_id === -2 && activeTest) {
            savedData.task =  response.current_task;
            savedData.tester_id = response.tester_id;
            savedData.timeOffset = response.timeOffset;

            let completed = arr => arr.every(v => v === true);
            if (!completed(savedData.task_completion_array)) {
                //window.browser.tabs.onUpdated.removeListener(reinstateListener);
                window.browser.tabs.onUpdated.addListener(reinstateListener);
            }
        }
        /*callback to display the results of a task*/
        else if (task_id === -3 && activeTest) {
            currentState.state = "task";
            currentState.task = test.tasks[task_id];
            sendToContentScript({
                messageType: "displayTaskResult",
                task: response.currenttask,
                success: response.success,
                timeTaken: response.timeTaken
            }, function (response) {
                if (response !== null && response !== undefined) {
                    if (response.task !== -2) {
                        let newresult = true;
                        let task_id = response.currenttask.id;
                        for (let i = 0; i < test_results.length; i++) {
                            if (test_results[i].task_id === task_id || task_id === "" || task_id === undefined || task_id === null) {
                                newresult = false;
                            }
                        }
                        savedData.task_completion_array[task_id] = true;
                        if (newresult) {
                            test_results.push({
                                task_id: task_id,
                                task: test.tasks[task_id].instruction,
                                timeLimit: test.tasks[task_id].timeLimit,
                                timeTaken: response.timeTaken,
                                success: response.success,
                                comment: response.comment
                            });
                        }
                        content_script_callback(response);
                    }
                }
            });
        }
        /* sending a task to the website */
        else if(activeTest){
            currentState.state = "task";
            currentState.task = test.tasks[task_id];
            if (response.task_completion_array !== undefined) {
                savedData.task_completion_array = response.task_completion_array;
            }
            sendToContentScript({
                messageType: "task",
                task: test.tasks[task_id],
                timeOffset: savedData.timeOffset,
                startTime: savedData.startTime,
                tester_id: savedData.tester_id,
                task_completion_array: savedData.task_completion_array,
            }, function (response) {
                if (response !== null && response !== undefined) {
                    if(response.task === -3){
                        if(activeTest && !savedData.task_completion_array[response.currenttask.id]){
                            content_script_callback(response);
                        }
                    }
                }
            });
        }
    }
}


/* handling messages from the extension popup */
window.browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.message === "startTest") {
            test_results = [];
            currentState.state = "start";
            savedData.task_completion_array = new Array(test.tasks.length).fill(false);
            savedData.task = 0;
            savedData.timeOffset = 0;
            currentState.startTime = new Date();
            //window.browser.tabs.onUpdated.removeListener(reinstateListener);
            activeTest = true;
            test = request.test;
            sendToContentScript({messageType: "start", taskCount: test.tasks.length}, function (response) {
                tester_id = response.tester_id;
                window.browser.tabs.onUpdated.addListener(reinstateListener);
                savedData.task_completion_array = new Array(test.tasks.length).fill(false);
                savedData.task = 0;
                savedData.timeOffset = 0;
                currentState.startTime = new Date();
                content_script_callback(response);
            });
        } else if (request.message === "getCSSID") {
            let counter = request.counter - 1;
            sendToContentScript({messageType: "getCSSID"}, function (response) {
                if (!response.original) {
                    stored_task.target.message = "The selected element has no CSS ID! The next parent with an ID " +
                        "(#" + response.id + ") was selected instead! When using #" + response.id +
                        " as a target, all of its child elements are viable targets. " +
                        "If you want to use the initially selected element as a target, consider giving it a unique CSS ID!";
                }
                else{
                    stored_task.target.message = "The element with the CSS ID #" + response.id + " was selected!";
                }

                if(stored_task.target.target_css_ids.length <= counter){
                    stored_task.target.target_css_ids.push(response.id);
                }
                else{
                    stored_task.target.target_css_ids[counter] = response.id;
                }

            });
        } else if (request.message === "getURL") {
            let counter = request.counter;

            sendToContentScript({messageType: "getURL"}, function (response) {
                window.browser.runtime.sendMessage({
                    reason: "getURL",
                    url: response.url,
                    counter: counter
                }, function (response) {
                });
            });

        } else if (request.message === "storeState") {
            stored_test = request.current_test;
            stored_task = request.current_task;
        } else if (request.message === "restoreState") {
            currentState.state = request.page;
        } else if (request.message === "getState") {
            window.browser.runtime.sendMessage({
                reason: "updateState",
                state: currentState.state,
                task: currentState.task,
                stored_test: stored_test,
                stored_task: stored_task,
                startTime: currentState.startTime
            }, function (response) {
                stored_task.target.message = null;
            });
        } else if (request.reason === "endCountdown") {
            currentState.startTime = null;
            savedData.startTime = null;
            if (request.cancelTest === true) {
                currentState.state = "end";
                currentState.task = null;
                currentState.startTime = null;
                savedData.task_completion_array = new Array(test.tasks.length).fill(false);
            }
        } else if (request.reason === "startCountdown") {
            currentState.startTime = new Date();
            savedData.startTime = new Date();
        }
        sendResponse();
    }
);
