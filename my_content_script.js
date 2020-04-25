var startTime, endTime, taskTimeout, tester_id, current_task, task_completion_array;
var re_counter = 0;

/* standardize for all browsers */
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

/* calculate the time spent */
function getTimeOffset() {
    endTime = new Date();
    var timeDiff = endTime - startTime;
    timeDiff /= 1000;
    return Math.round(timeDiff);
}

/* to cancel the test */
function addCancelButton() {
    $(".logo > img").attr("src", window.browser.runtime.getURL("img/icon_big_white.png"));
    $("#usability_testing_addon_cancel").click(function () {
        let r = confirm("Do you really want to cancel this usability test? Your results will not saved! Continue?");
        if (r) {
            clearTimeout(taskTimeout);
            removeOverlay();
            window.browser.runtime.sendMessage({reason: "endCountdown", cancelTest: true}, function (response) {
            });
        }
    });
}

/* displaying a message*/
function displayToast(title, message, timeout) {
    var toast = $("#usability_testing_addon_overlay_toast").attr("style", "");
    toast.html("<h3>" + title + "</h3><p>" + message + "</p>");
    setTimeout(function () {
        $("#usability_testing_addon_overlay_toast").attr("style", "transform: scale(1) !important; opacity: 1 !important");
        if (timeout > 0) {
            setTimeout(function () {
                $("#usability_testing_addon_overlay_toast").attr("style", "transform: scale(0) !important; opacity: 0 !important");
            }, timeout);
        }
    }, 0);
}

/* hide the overlay on the website */
function removeOverlay() {
    $("#usability_testing_addon_overlay").remove();
}

/* after the page is reloaded, reinstate the current task */
function reinstateTask(task, timeOffset, start_time, callback) {
    $("<button class='logo_button medium usability_testing_addon_cancel_task' id='usability_testing_addon_cancel_task_" + task.id + "' style='" +
        "color: #ffffff !important; padding: 5px 7px !important; z-index: 16777271 !important; position: fixed !important; text-align: right !important;" +
        "width: 125px !important; height: 30px !important; top: 10px !important; right: 9px !important; font-size: 15px !important;'><img src='" + window.browser.runtime.getURL("img/cancel.svg") + "' alt=''><span>Cancel Task!</span></button>").appendTo("body");
    setTimeout(function () {
        $(".usability_testing_addon_cancel_task").click(function () {
            $(this).remove();
            task_completion_array[task.id] = true;
            clearTimeout(taskTimeout);
            callback(false, 0);
        });
    }, 1000);
    re_counter++;
    if(start_time !== null && start_time !== undefined){
        startTime = new Date(start_time);
    }
    else{
        startTime = new Date();
    }

    if (task.time !== "no_limit") {
        var offset;
        if (start_time !== null && start_time !== undefined) {
            startTime = new Date(start_time);
            offset = getTimeOffset();
        } else {
            offset = 0;
        }
        if (offset < 0) {
            offset = 0;
        }
        taskTimeout = setTimeout(function () {
            if (!task_completion_array[task.id]) {
                window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                });
                task_completion_array[task.id] = true;
                $("#usability_testing_addon_cancel_task_" + task.id).remove();
                task_completion_array[task.id] = true;
                callback(false, 0);
            } else {
                callback(null, 0, true);
            }
        }, (parseInt(task.time) - offset) * 1000);
    }

    if (task.target.target_type === "css_id") {
        $("#" + task.target.target_css_ids.join(", #")).bind("click.usabilityTestHandler", function () {
            if (!task_completion_array[task.id]) {
                $("#usability_testing_addon_cancel_task_" + task.id).remove();
                let seconds = getTimeOffset();
                window.broswser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                });
                clearTimeout(taskTimeout);
                task_completion_array[task.id] = true;
                callback(true, seconds);
            } else {
                callback(null, 0, true);
            }
        });
    } else if (task.target.target_type === "both" && task.target.target_urls.includes(window.location.href)) {
        $("#" + task.target.target_css_ids.join(", #")).bind("click.usabilityTestHandler", function () {
            if (!task_completion_array[task.id]) {
                $("#usability_testing_addon_cancel_task_" + task.id).remove();
                window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                });
                clearTimeout(taskTimeout);
                let seconds = getTimeOffset();
                task_completion_array[task.id] = true;
                callback(true, seconds);
            } else {
                callback(null, 0, true);
            }
        });
    } else if (task.target.target_type === "url") {
        if (task.target.target_urls.includes(window.location.href)) {
            if (!task_completion_array[task.id]) {
                let seconds = getTimeOffset();
                window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                });
                clearTimeout(taskTimeout);
                task_completion_array[task.id] = true;
                callback(true, seconds);
            }
            else {
                callback(null, 0, true);
            }
        }
    }
}

/* display the title of the test and the start test button */
function displayStart(callback) {
    $("<div id='usability_testing_addon_overlay' style='opacity: 0  !important; background-color: rgba(50, 50, 50, 0.97) !important;  z-index: 16777270 !important; " +
        "position: fixed !important; width: 100vw !important; height: 100vh !important; top: 0 !important; left: 0 !important;'>" +
        "<div class='usability_testing_addon_logo'><img src='" + window.browser.runtime.getURL("img/icon_big_white.png") + "' alt='logo'><span>Usability Test</span></div>" +
        "<div style='font-size: 24px  !important; position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; text-align: center !important; width: 80% !important;color:white!important;'>" +
        "Enter your Name or Identification below:" +
        "<br/>" +
        "<input type='text' placeholder='Name or Identification' id='usability_testing_addon_identification'>" +
        "<br/><br/>" +
        "<button id='usability_testing_addon_take_test' class='logo_button'> <img alt='' src='" + window.browser.runtime.getURL("img/next.svg") + "'/><span>Start Usability Test!</span></button></div>" +
        "<span id='usability_testing_addon_cancel' style='padding: 6px 7px !important;" +
        " z-index: 16777271 !important; position: fixed !important; text-align: right !important; width: 50px !important; " +
        "height: 50px !important; top: 15px !important; right: 30px !important; font-size: 50px !important;'>X</span>" +
        "</div>").appendTo("body");
    addCancelButton();
    setTimeout(function () {
        $("#usability_testing_addon_overlay").css("transition", "opacity 0.25s ease-out").css("opacity", "1");
    }, 0);
    $("#usability_testing_addon_take_test").click(function () {
        tester_id = $("#usability_testing_addon_identification").val();
        removeOverlay();
        callback();
    });
}

/* display the task to be completed */
function displayTask(task, start_time, callback) {
    $("<div id='usability_testing_addon_overlay' style='background-color: rgba(50, 50, 50, 0.97) !important; z-index: 16777270 !important; position: fixed !important; " +
        "width: 100vw !important; height: 100vh !important; top: 0 !important; left: 0 !important;'>" +
        "<div class='usability_testing_addon_logo'><img src='" + window.browser.runtime.getURL("img/icon_big_white.png") + "' alt='logo'><span>Usability Test</span></div>" +
        "<div style='font-size: 24px !important; position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; text-align: center !important; width: 80% !important;color:white!important;'>" +
        "<p class='usability_testing_addon_task_instruction'>" + task.instruction + "</p>" + (task.time === "no_limit" ? "" : "<p class='usability_testing_addon_task_time_limit'>(" + task.time + " seconds)</p>") +
        "<br/><br/><button class='usability_testing_addon_start_task logo_button' id='usability_testing_addon_start_task_" + task.id + "'><img alt='' src='" + window.browser.runtime.getURL("img/next.svg") + "'/><span>Start!</span></button></div>" +
        "<span id='usability_testing_addon_cancel' style='padding: 6px 7px !important; z-index: 16777271 !important; position: fixed !important; text-align: right !important; " +
        "width: 50px !important; height: 50px !important; top: 15px !important; right: 50px !important; font-size: 50px !important;'>X</span>" +
        "</div>").appendTo("body");

    addCancelButton();
    $("#usability_testing_addon_start_task_" + task.id).click(function () {
        //startTime = new Date();

        if (task.target.target_type === "css_id") {
            $("#" + task.target.target_css_ids.join(", #")).bind("click.usabilityTestHandler", function () {
                if (!task_completion_array[task.id]) {
                    window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                    });
                    $(this).unbind("click.usabilityTestHandler");
                    $("#usability_testing_addon_cancel_task_" + task.id).remove();
                    task_completion_array[task.id] = true;
                    let seconds = getTimeOffset();
                    callback(true, seconds);
                    clearTimeout(taskTimeout);
                } else {
                    callback(null, 0, true);
                }
            });
        } else if (task.target.target_type === "both" && task.target.target_urls.includes(window.location.href)) {
            $("#" + task.target.target_css_ids.join(", #")).bind("click.usabilityTestHandler", function () {
                if (!task_completion_array[task.id]) {
                    window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                    });
                    $(this).unbind("click.usabilityTestHandler");
                    $("#usability_testing_addon_cancel_task_" + task.id).remove();
                    task_completion_array[task.id] = true;
                    let seconds = getTimeOffset();
                    callback(true, seconds);
                    clearTimeout(taskTimeout);
                } else {
                    callback(null, 0, true);
                }
            });
        } else if (task.target.target_type === "url") {
            if (task.target.target_urls.includes(window.location.href)) {
                if (!task_completion_array[task.id]) {
                    setTimeout(function () {
                        window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                        });
                        $("#usability_testing_addon_cancel_task_" + task.id).remove();
                        $(".usability_testing_addon_cancel_task").remove();
                        task_completion_array[task.id] = true;
                        clearTimeout(taskTimeout);
                        callback(true, 0);
                    }, 250);
                } else {
                    callback(null, 0, true);
                }
            }
        }

        if (task.target.target_urls.includes(window.location.href)) {
            removeOverlay();
        } else {
            removeOverlay();
        }

        $("<button class='logo_button medium usability_testing_addon_cancel_task' id='usability_testing_addon_cancel_task_" + task.id + "' style='" +
            "color: #ffffff !important; padding: 5px 7px !important; z-index: 16777271 !important; position: fixed !important; text-align: right !important;" +
            "width: 125px !important; height: 30px !important; top: 10px !important; right: 9px !important; font-size: 15px !important;'><img src='" + window.browser.runtime.getURL("img/cancel.svg") + "' alt=''><span>Cancel Task!</span></button>").appendTo("body");
        $("#usability_testing_addon_cancel_task_" + task.id).click(function () {
            window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
            });
            $("#usability_testing_addon_cancel_task_" + task.id).remove();
            clearTimeout(taskTimeout);
            task_completion_array[task.id] = true;
            callback(false, 0);
        });
        // = new Date();
        clearTimeout(taskTimeout);
        if (task.time !== "no_limit") {
            var offset;
            if (start_time !== null && start_time !== undefined) {
                startTime = new Date(start_time);
                offset = getTimeOffset();
            } else {
                window.browser.runtime.sendMessage({reason: "startCountdown"}, function (response) {
                });
                offset = 0;
            }
            if (offset < 0) {
                window.browser.runtime.sendMessage({reason: "startCountdown"}, function (response) {
                });
                offset = 0;
            }
            taskTimeout = setTimeout(function () {
                if (!task_completion_array[task.id]) {
                    window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                    });
                    $("#usability_testing_addon_cancel_task_" + task.id).remove();
                    task_completion_array[task.id] = true;
                    callback(false, 0);
                } else {
                    callback(null, 0, true);
                }
            }, (parseInt(task.time) - offset) * 1000);
        }
    });
}

/* after a task is completed, display the results */
function displayTaskResult(task, success, timeTaken, callback) {
    setTimeout(function () {
        $("#usability_testing_addon_cancel_task_" + task.id).remove();
    }, 10);
    clearTimeout(taskTimeout);
    $("<div id='usability_testing_addon_overlay' style='opacity; 0  !important; background-color: rgba(50, 50, 50, 0.97) !important; z-index: 16777270 !important; position: fixed !important; " +
        "width: 100vw !important; height: 100vh !important; top: 0 !important; left: 0 !important;'>" +
        "<div class='usability_testing_addon_logo'><img src='" + window.browser.runtime.getURL("img/icon_big_white.png") + "' alt='logo'><span>Usability Test</span></div>" +
        "<div style='font-size: 24px !important; position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; text-align: center !important; width: 80% !important;color:white!important;'>" +
        "" + (success ? "<p class='usability_testing_addon_task_success'>Task was completed successfully!</p> It took you " + timeTaken + " seconds to complete the task!<br/>" : "<p class='usability_testing_addon_task_success'>Task was not completed!</p>") +
        "<br/>Where there any issues with the task? Was it too easy or too hard?<br/> Please comment:<br/>" +
        "<textarea style='width: 474px !important; height: 164px !important; margin-bottom: 15px !important; margin-top: 20px !important; background-color: white !important; text-align: left !important; border-radius: 5px !important;' id='usability_testing_addon_comment'></textarea><br/>" +
        "<button class='usability_testing_addon_conclude_task logo_button' id='usability_testing_addon_conclude_task_" + task.id + "'><img alt='' src='" + window.browser.runtime.getURL("img/next.svg") + "'/><span>Conclude this task!</span></button></div>" +
        "<span id='usability_testing_addon_cancel' style='padding: 6px 7px !important; z-index: 16777271 !important; position: fixed !important; text-align: right !important; " +
        "width: 50px !important; height: 50px !important; top: 15px !important; right: 30px !important; font-size: 50px !important;'>X</span>" +
        "</div>").appendTo("body");

    setTimeout(function () {
        $("#usability_testing_addon_overlay").css("transition", "opacity 0.25s ease-out").css("opacity", "1");
    }, 0);
    $("#usability_testing_addon_conclude_task_" + task.id).click(function () {
        callback($("#usability_testing_addon_comment").val());
        removeOverlay();
    });
    $(".usability_testing_addon_cancel_task").remove();
    addCancelButton();
}

/* when the test is complete display the results */
function displayResults(results, tasks, transfer_type, first, callback) {
    clearTimeout(taskTimeout);
    setTimeout(function () {
        $(".usability_testing_addon_cancel_task").remove();
        $("#usability_testing_addon_cancel").remove();
    }, 250);
    if (results.length !== tasks.length) {
        //alert("An unexpected error occurred! Please try again.");
    }
    if (first) {
        var results_html = "<table id='usability_testing_addon_results_table'><tr><th>Task</th><th>Successful</th><th>Time Taken</th><th>Time Limit</th><th>Comment</th></tr>";
        for (let i = 0; i < tasks.length; i++) {
            results_html += "<tr><td>" + results[i].task + "</td><td>" + (results[i].success ? "Yes" : "No") + "</td><td>" + (results[i].success ? results[i].timeTaken : "-") + "</td><td>" + (tasks[i].time === 'no_limit' ? "None" : tasks[i].time) + "</td><td>" + (typeof results[i].comment === 'undefined' ? "-" : results[i].comment) + "</td></tr>";
        }
        results_html += "</table>";
        $("<section id=\"usability_testing_addon_overlay_toast\">\n" +
            "    <h3>Message sent!</h3>\n" +
            "    <p>Thanks for getting in touch with me!<br/>\n" +
            "        I will get back to you as soon possible.</p>\n" +
            "</section><div id='usability_testing_addon_overlay' style='background-color: rgba(50, 50, 50, 0.97) !important;  z-index: 16777270 !important; position: fixed !important; " +
            "width: 100vw !important; height: 100vh !important; top: 0 !important; left: 0 !important;'>" +
            "<div class='usability_testing_addon_logo'><img src='" + window.browser.runtime.getURL("img/icon_big_white.png") + "' alt='logo'><span>Usability Test</span></div>" +
            "<div style='overflow-x: auto !important; font-size: 24px !important; position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; text-align: center !important; width: 80% !important; color:white!important;'>" +
            results_html +
            "<button id='usability_testing_addon_send_result_email' class='logo_button'><img alt='' src='" + window.browser.runtime.getURL("img/cursor.svg") + "'/><span>Send Result to Owner</span></button>" +
            "<button id='usability_testing_addon_download_result' class='logo_button'><img alt='' src='" + window.browser.runtime.getURL("img/download-1.svg") + "'/><span>Download Result</span></button>" +
            "<button id='usability_testing_addon_end_test' class='logo_button'><img alt='' src='" + window.browser.runtime.getURL("img/cancel.svg") + "'/><span>End Usability Test!</span></button>" + "</div>" +
            "<span id='usability_testing_addon_cancel' style='padding: 6px 7px !important; z-index: 16777271 !important; position: fixed !important; text-align: right !important; " +
            "width: 50px !important; height: 50px !important; top: 15px !important; right: 30px !important; font-size: 50px !important;' >X</span>" +
            "</div>").appendTo("body");
    }
    $("#usability_testing_addon_overlay_toast").click(function () {
        $(this).attr("style", "transform: scale(0) !important; opacity: 0 !important");
    });
    $("#usability_testing_addon_download_result").click(function () {
        callback("download");
    });
    if (transfer_type !== "none") {
        $("#usability_testing_addon_send_result_email").click(function () {
            callback("send");
        });
    } else {
        $('#usability_testing_addon_send_result_email').remove();
    }
    $("#usability_testing_addon_end_test").click(function () {
        removeOverlay();
    });
}


/* handle request from the background script */
window.browser.extension.onRequest.addListener(function (request, sender, sendResponse) {
    if (!((request.messageType === "end" && (request.first === false || request.first === undefined)) || request.messageType === "getURL" || request.messageType === "cancelTask")) {
        removeOverlay();
    }
    switch (request.messageType) {
        /* display start */
        case "start":
            window.onbeforeunload = function (event) {
                sendResponse({task: 0});
            };
            task_completion_array = new Array(request.taskCount).fill(false);
            displayStart(function () {
                removeOverlay();
                sendResponse({task: 0, tester_id: tester_id});
            });
            break;
        /* reinstate task */
        case "reinstate":
            window.onbeforeunload = function (event) {
                let seconds = getTimeOffset();
                if (request.task.target_type === "css_id" || (request.task.target.target_type === "both" && request.task.target.target_urls.includes(window.location.href))) {
                    $("#" + request.task.target.target_css_ids.join(", #")).unbind("click.usabilityTestHandler");
                }
                setTimeout(function () {
                    sendResponse({
                        task: -2,
                        //timeOffset: seconds,
                        // startTime : startTime,
                        timeOffset: seconds,
                        tester_id: tester_id,
                        current_task: request.task,
                        task_completion_array: task_completion_array
                    });
                }, 0);
            };
            tester_id = request.tester_id;
            task_completion_array = request.task_completion_array;
            current_task = request.task;
            let completed = arr => arr.every(v => v === true);
            if (!completed(task_completion_array) && !task_completion_array[request.task.id]) {
                reinstateTask(request.task, request.timeOffset, request.startTime, function (success, timeTaken, throwaway = false) {
                    if (throwaway) {
                        sendResponse();
                    } else {
                        if (timeTaken == null || isNaN(timeTaken)) {
                            timeTaken = 0;
                        }
                        if (request.task.target_type === "css_id" || (request.task.target.target_type === "both" && request.task.target.target_urls.includes(window.location.href))) {
                            $("#" + request.task.target.target_css_ids.join(", #")).unbind("click.usabilityTestHandler");
                        }
                        removeOverlay();
                        sendResponse({
                            currenttask: request.task,
                            task: -3,
                            success: success,
                            timeTaken: timeTaken
                        });
                    }
                });
            } else {
                sendResponse();
            }
            break;
        /* display task */
        case "task":
            task_completion_array = request.task_completion_array;
            window.onbeforeunload = function (event) {
                let seconds = getTimeOffset();
                sendResponse({
                    task: -2,
                    //timeOffset: seconds,
                    //startTime : startTime,
                    timeOffset: seconds,
                    tester_id: tester_id,
                    current_task: request.task,
                    task_completion_array: task_completion_array
                });
            };
            current_task = request.task;
            displayTask(request.task, request.startTime, function (success, timeTaken, throwaway = false) {
                if (throwaway) {
                    sendResponse();
                } else {
                    window.browser.runtime.sendMessage({reason: "endCountdown"}, function (response) {
                    });
                    if (timeTaken == null || isNaN(timeTaken)) {
                        timeTaken = 0;
                    }
                    if (request.task.target_type === "css_id" || (request.task.target.target_type === "both" && request.task.target.target_urls.includes(window.location.href))) {
                        $("#" + request.task.target.target_css_ids.join(", #")).unbind("click.usabilityTestHandler");
                    }
                    $(".usability_testing_addon_cancel_task").remove();

                    sendResponse({
                        currenttask: request.task,
                        task: -3,
                        success: success,
                        timeTaken: timeTaken
                    });

                }
            });
            break;
        /* cancel task (if button on the extension is pressed) */
        case "displayTaskResult":
            displayTaskResult(request.task, request.success, request.timeTaken, function (comment, throwaway = false) {
                if (throwaway) {
                    sendResponse();
                } else {
                    sendResponse({
                        currenttask: request.task,
                        task: (parseInt(current_task.id) + 1),
                        success: request.success,
                        timeTaken: request.timeTaken,
                        comment: comment,
                        task_completion_array: task_completion_array
                    });
                }

            });
            break;
        case "cancelTask":
            let cancelButton = $(".usability_testing_addon_cancel_task");
            if (cancelButton.length !== 0) {
                cancelButton.click();
            }
            sendResponse();
            break;
        /* select element by click */
        case "getCSSID":
            $('body').bind("mousemove.selectTargetHandlerBody", function (event) {
                $(".usability_extension_highlighted").removeClass("usability_extension_highlighted");
                $(event.target).addClass("usability_extension_highlighted");
                setTimeout(function () {
                    $(".usability_extension_highlighted").bind("click.selectTargetHandler", function (ev) {
                        var target = ev.target || ev.srcElement;
                        var original = true;
                        while (target && !target.id) {
                            original = false;
                            target = target.parentNode;
                        }
                        var element_id = target.id;
                        $(".usability_extension_highlighted").unbind("click.selectTargetHandler").removeClass("usability_extension_highlighted");
                        $("body").unbind("mousemove.selectTargetHandlerBody");
                        if (!original) {
                            $("#" + element_id).addClass("usability_extension_highlighted");
                        }

                        sendResponse({id: element_id, original: original});
                    });
                }, 0);
            });
            break;
        /* display current page URL */
        case "getURL":
            sendResponse({url: window.location.href});
            break;
        /* display test results */
        case "end":
            $("#usability_testing_addon_cancel").remove();

            displayResults(request.testResults, request.tasks, request.transfer_type, request.first, function (returnVal) {
                sendResponse({task: -1, returnVal: returnVal, tester_id: tester_id});
            });
            if (request.success === true) {
                displayToast("Your results were send successfully!", "Your test results have been successfully transferred to the creator of this test. Thank you!", 7000);
            } else if (request.success === false) {
                displayToast("Error while sending result!", "An error occurred while sending your result to the creator of this test. Please download the result and send it manually!", 10000);
            }

            window.onbeforeunload = function (event) {
                sendResponse();
            };
            break;
        default:
           // alert("unknown request");
            sendResponse();
    }
});
