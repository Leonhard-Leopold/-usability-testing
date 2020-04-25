var test = {test_title: "", tasks: [], transfer_results: {transfer_type: "email", email: "", url: ""}};
var useTimeLimit = false;
var task_counter = 0;
var test_results = [];
var resultfiles = [];
var resultHTML = "";
var savedData = {};
var countdown_timeout;
var color_map = {
    25: "#ffb993",
    50: "#ffea26",
    75: "#8bff00",
    100: "#00ff03"
};

/* standardize for all browsers */
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

/* communicate with the content script */
function sendToContentScript(message, callback) {
    window.browser.tabs.getSelected(null, function (tab) {
        window.browser.tabs.sendRequest(tab.id, message, callback);
    });
}

/* display popup instead of alerting */
function displayToast(title, message, timeout) {
    $("#toast").html("<h3>" + title + "</h3><p>" + message + "</p>").fadeIn(500);
    if (timeout > 0) {
        setTimeout(function () {
            $("#toast").fadeOut(500);
        }, timeout);
    }
}

/* shake element in the case of an error */
function addShake(element) {
    $(".shake").removeClass("shake");
    $("#" + element).addClass("shake");
    setTimeout(function () {
        $("#" + element).removeClass("shake");
    }, 1000);
}


/* evaluate the selected TEST file */
function evalFile(file, type) {
    if (file == null) {
        $(this).find("p").html("Please select one JSON file!");
        addShake("drop_zone");
        return;
    }
    let filename = file.name;
    $("#drop_zone > p").html("Selected File: " + filename);
    $("#takeTestButton").css("display", "block");

    var reader = new FileReader();
    reader.onload = function () {
        var text = reader.result;
        if (type === "json" || type === "application/json") {
            let obj = JSON.parse(text);
            if ("test_title" in obj && "transfer_results" in obj && "tasks" in obj && obj.tasks.length > 0) {
                test = obj;
            } else {
                $("#drop_zone > p").html("The selected test file is invalid!");
                addShake("drop_zone");
                $("#takeTestButton").css("display", "none");
            }
        }
    };
    reader.readAsText(file);
}

/* countdown on the take test page */
function countdown() {
    countdown_timeout = setTimeout(function () {
        let timer = parseInt($("#remaining_seconds").html());
        if (timer > 0) {
            $("#remaining_seconds").html(timer - 1);
            countdown();
        } else {
            $("#takeTest_cancel").css("display", "none");
        }
    }, 1000);
}


/* evaluate the selected RESULT files before creating a summary */
function evalResultFiles(fileList) {
    let files = [];
    if (fileList.length === 0) {
        return;
    }
    for (let file of fileList) {
        if (file.type === "application/json" || file.name.split('.').pop().toLowerCase() === "json") {
            let filePromise = new Promise(resolve => {
                let reader = new FileReader();
                reader.readAsText(file);
                reader.onload = () => resolve(reader.result);
            });
            files.push(filePromise);
        }
    }
    Promise.all(files).then(fileContents => {
        let valid_files = [];
        let new_result_files = [];
        let valid_counter = 0;
        for (let i = 0; i < fileContents.length; i++) {
            let obj = JSON.parse(fileContents[i]);
            if (obj.test === undefined) {
                valid_files.push({filename: fileList[i].name, valid: false});
            } else if (obj.test.tasks === undefined) {
                valid_files.push({filename: fileList[i].name, valid: false});
            } else if (!("test" in obj && "test_title" in obj.test && "transfer_results" in obj.test && "tasks" in obj.test && obj.test.tasks.length > 0
                && "tester_id" in obj && "results" in obj && obj.results.length === obj.test.tasks.length)) {
                valid_files.push({filename: fileList[i].name, valid: false});
            } else {
                valid_files.push({filename: fileList[i].name, valid: true, counter: valid_counter});
                valid_counter++;
                new_result_files.push(obj);
            }
        }
        resultfiles = new_result_files;
        displayResultFileError(valid_files, valid_counter);
        if (valid_counter !== 0) {
            $("#createSummaryButton").css("display", "block");
        }
    });
}

/* evaluating whether a supplied file is a valid result file */
function displayResultFileError(files, valid_file_counter) {
    $(".filesDraggedOver").removeClass("filesDraggedOver");
    $("#drop_zone_results > p").html("Drag multiple Result Files (.json) into this area");
    $("#drop_zone_results > p").append("<br/><hr style='margin-bottom: 25px'/><br> ").css("margin-bottom", "-25px");
    for (let i = 0; i < files.length; i++) {
        if (files[i].valid) {
            $("#drop_zone_results > p").append("<div class='result_file valid'><button class='remove_result' id='remove_result_" + files[i].counter + "'>x</button><p title='" + files[i].filename + "'>" + files[i].filename + "</p></div>");
        } else {
            displayToast("Invalid Files", "Some selected files are invalid result files!", 5000);
            addShake("drop_zone_results");
            $("#drop_zone_results > p").append("<div class='result_file invalid'><button class='remove_result invalid_result' >x</button><p title='" + files[i].filename + "'><strong>Invalid File</strong><br>" + files[i].filename + "</p></div>");
        }
    }
    setTimeout(function () {
        $('.invalid_result').click(function () {
            $(this).parent().remove();
        });

        for (let i = 0; i < valid_file_counter; i++) {
            $("#remove_result_" + i).click(function () {
                resultfiles[i] = null;

                var resultfiles_help = [];
                for (let i = 0; i < resultfiles.length; i++) {
                    if (resultfiles[i] !== null) {
                        resultfiles_help.push(resultfiles[i]);
                    }
                }
                if (resultfiles_help.length === 0) {
                    $("#createSummaryButton").css("display", "none");
                }
                $(this).parent().remove();
            });
        }

    }, 0);
}

/* the popup closes whenever the user clicks somewhere else. This erases values entered in input fields.
* This function stores these values in the persistent background script*/
function storeCreateTestForm() {
    let instruction = $("#instruction").val();
    let target_type = $('input[name="target_type"]:checked').val();
    let time = $("#timeLimit").val();
    var target_urls = [];
    var target_css_ids = [];
    var urls = document.getElementsByClassName("url_target");
    var css_id = document.getElementsByClassName("css_id_target");
    for (let i = 0; i < urls.length; i++) {
        if (urls[i].value !== "") {
            target_urls.push(urls[i].value);
        }
    }
    for (let i = 0; i < css_id.length; i++) {
        if (css_id[i].value.split('#').join(' ') !== "") {
            target_css_ids.push(css_id[i].value.split('#').join(' '));
        }
    }
    let target = {target_type: target_type, target_urls: target_urls, target_css_ids: target_css_ids};
    let task = {
        id: task_counter,
        instruction: instruction,
        time: time,
        time_limit_visible: ($("#timeLimitWrapping").css("display") === "block"),
        target: target
    };
    window.browser.runtime.sendMessage({
        message: "storeState",
        current_test: test,
        current_task: task
    });
}

/* when the popup is loaded, event handlers need to be created externally*/
$(document).ready(function () {
    $("#browse_result_files").click(function () {
        $("#file_input_results").click();
    });
    $("#browse_files").click(function () {
        $("#file_input").click();
    });

    /* the contents of the summary page are created and displayed */
    $("#createSummaryButton").click(function () {
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "createSummary"
        });
        $("#loadResults").css("display", "none");
        $("#toast").fadeOut(500);
        var resultfiles_help = [];
        for (let i = 0; i < resultfiles.length; i++) {
            if (resultfiles[i] !== null) {
                resultfiles_help.push(resultfiles[i]);
            }
        }
        resultfiles = resultfiles_help;
        if (resultfiles.length === 0) {
            $("#loadResults").css("display", "block");
            displayToast("No File Selected", "There was no result file selected", 5000);
            addShake("drop_zone_results");
        } else {
            let different_test_titles = [];
            var results_file_groups = [];
            for (let i = 0; i < resultfiles.length; i++) {
                let test_title = resultfiles[i].test.test_title;
                if (!different_test_titles.includes(test_title)) {
                    different_test_titles.push(test_title);
                    results_file_groups.push([resultfiles[i]]);
                } else {
                    results_file_groups[different_test_titles.indexOf(test_title)].push(resultfiles[i]);
                }
            }
            for (let a = 0; a < results_file_groups.length; a++) {
                var result_group = results_file_groups[a];
                var task_averages = [];
                resultHTML = "          " +
                    "<div class='result_test_wrapper'><div>\n" +
                    "       <h1 class='results_test_title'>" + result_group[0].test.test_title + "</h1>" +
                    "           <hr style='margin-top: 0;' /><h2 class='results_test_overview'>Overview of all Results</h2>\n" +
                    "                <table class='results_test_overview_table'>\n" +
                    "                    <tr><th>Task</th><th>Success Rate</th><th>Average Time " +
                    "<div style='bottom: -2px; right: -4px;' class=\"tooltip right_tooltip\"><img alt=\"i\" src=\"img/info_black.svg\"/>\n" +
                    "                    <span class=\"tooltiptext\">If the task was completed successfully.</span>\n" +
                    "                </div></th></tr>";
                for (let i = 0; i < result_group[0].test.tasks.length; i++) {
                    let averages = {success: 0, timeTaken: 0};
                    let successful_tasks = 0;
                    for (let j = 0; j < result_group.length; j++) {
                        averages.success += (result_group[j].results[i].success ? 1 : 0);
                        averages.timeTaken += (result_group[j].results[i].success ? result_group[j].results[i].timeTaken : 0);
                        successful_tasks += (result_group[j].results[i].success ? 1 : 0);
                    }
                    averages.success = Math.round(averages.success / result_group.length * 100);
                    averages.timeTaken = Math.round(averages.timeTaken / successful_tasks * 100) / 100;
                    resultHTML += "<tr><td>" + result_group[0].test.tasks[i].instruction + "</td><td>" + averages.success + "%</td><td>" + (Number.isNaN(averages.timeTaken) ? "-" : averages.timeTaken + " sec")+"</td></tr>";
                    task_averages.push(averages);
                }
                resultHTML += " </table>\n" +
                    "            </div><hr style='margin: 15px 10px 5px 10px;'/><h2 class='results_detail_header'>Comments & Analysis of each Task </h2><div>";

                for (let i = 0; i < result_group[0].test.tasks.length; i++) {
                    let color = "#ff3f3f";
                    Object.keys(color_map).forEach(function (key) {
                        if (task_averages[i].success >= key) {
                            color = color_map[key];
                        }
                    });
                    resultHTML += "" +
                        "   <div id=\"overview_task_" + different_test_titles[a] + "_" + i + "\">\n" +
                        "                <button class=\"accordion inactive\">" + result_group[0].test.tasks[i].instruction + "</button>\n" +
                        "                <div class=\"panel inactive\">\n" +
                        "                    <div><div class='result_success_rate_label_wrapper'><img src='img/bar-chart.svg' alt='' /><label class='result_success_rate_label'>Success Rate: </label></div>" +
                        "<div class='result_success_rate_wrapper'><div style='background-color: " + color + "; width: " + task_averages[i].success + "%' class='result_success_rate_loading_bar'>"
                        + task_averages[i].success + "%</div></div>  </div>                 " +
                        "\n" +
                        "                    <p><img class='results_average_time_icon' src='img/watch.svg' alt='' /><label class='results_average_time_label'>Average Time (if successful): </label>"
                        + "<label class='results_average_time'>"+(Number.isNaN(task_averages[i].timeTaken) ? "-" : task_averages[i].timeTaken + " seconds")+"</label></p>\n" +
                        "                    <hr/><h2 class='result_comments_header'>Comments</h2>\n" +
                        "                    <div>\n";
                    let comment_counter = 0;
                    for (let j = 0; j < result_group.length; j++) {
                        if (result_group[j].results[i].comment !== undefined && result_group[j].results[i].comment !== "") {
                            comment_counter++;
                            resultHTML += "                        <p class='result_comment'><img src='img/chat.svg' alt='' /><strong>" + result_group[j].tester_id + "</strong> commented: \"<strong>\n" +
                                "                        " + result_group[j].results[i].comment + "\"</strong></p>\n";
                        }
                    }
                    if (comment_counter === 0) {
                        resultHTML += "<p><strong>No Comments!</strong></p>";
                    }
                    resultHTML += "                    </div><hr style='margin-top: 25px;'/>\n" +
                        "                </div>\n" +
                        "            </div>" +
                        "";
                }
                resultHTML += "</div></div>";
                $("#displayResults").css("display", "block").prepend(resultHTML);
            }
            setTimeout(function () {
                var acc = document.getElementsByClassName("accordion");
                for (var i = 0; i < acc.length; i++) {
                    acc[i].addEventListener("click", function () {
                        this.classList.toggle("active");
                        this.classList.toggle("inactive");
                        $(this).parent().find(".panel").toggleClass("active");
                        $(this).parent().find(".panel").toggleClass("inactive");
                        var panel = this.nextElementSibling;
                        if (panel.style.maxHeight) {
                            panel.style.maxHeight = null;
                        } else {
                            panel.style.maxHeight = panel.scrollHeight + "px";
                        }
                    });
                }
            }, 100);
        }
    });

    /* the html2pdf library is used to store the result Summary to PDF*/
    $("#download_results").click(function () {
        var element = document.getElementById('displayResults');
        let active_array = [];
        $(".accordion, .panel").addClass("no_transition");
        $(".tooltip").css("display", "none");
        $("#displayResults").css("padding-top", "125px");
        $("#download_results").css("display", "none");
        $(".accordion").each(function () {
            active_array.push($(this).hasClass("active"));
            if ($(this).hasClass("inactive")) {
                $(this).click();
            }
        });
        html2pdf().from(element).save().then(function () {

            $(".accordion").each(function (index) {
                if (active_array[index] === false) {
                    $(this).click();
                }
            });
            $("#displayResults").css("padding-top", "15px");
            $(".no_transition").removeClass("no_transition");
            $(".tooltip").css("display", "inline-block");
            $("#download_results").css("display", "block");
        });
    });

    $("#test_title").change(function () {
        test.test_title = $(this).val();
        storeCreateTestForm();
    });
    $("#test_email").change(function () {
        test.transfer_results.email = $(this).val();
        storeCreateTestForm();
    });
    $("#test_url").change(function () {
        test.transfer_results.url = $(this).val();
        storeCreateTestForm();
    });

    $("#transfer_method_email").click(function () {
        test.transfer_results.transfer_type = "email";
        $("#test_email").css("display", "inline-block");
        $("#test_url").css("display", "none");
        storeCreateTestForm();
    });

    $("#transfer_method_none").click(function () {
        test.transfer_results.transfer_type = "none";
        $("#test_email").css("display", "none");
        $("#test_url").css("display", "none");
        storeCreateTestForm();
    });
    $("#backButton").click(function () {
        $("section").css("display", "none");
        $("main").css("display", "block");
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "none"
        });
    });
    $("#about_link").click(function () {
        $("#about").css("display", "block");
        $("main").css("display", "none");
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "about"
        });
    });
    $("#transfer_method_url").click(function () {
        test.transfer_results.transfer_type = "url";
        $("#test_email").css("display", "none");
        $("#test_url").css("display", "inline-block");
        storeCreateTestForm();
    });

    $("#addTimeLimit").click(function () {
        if (useTimeLimit) {
            $("#timeLimitWrapping").css("display", "none");
            useTimeLimit = false;
        } else {
            $("#timeLimitWrapping").css("display", "block");
            useTimeLimit = true;
        }
        storeCreateTestForm();
    });
    $("#createTestButton").click(function () {
        $("#createTest").css("display", "block");
        $("main").css("display", "none");
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "createTest"
        });
        storeCreateTestForm();
    });
    $("#loadTestButton").click(function () {
        $("#loadTest").css("display", "block");
        $("main").css("display", "none");
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "takeTest"
        });
    });
    $("#loadResultsButton").click(function () {
        $("#loadResults").css("display", "block");
        $("main").css("display", "none");
        window.browser.runtime.sendMessage({
            message: "restoreState",
            page: "createSummary"
        });
    });
    $("#takeTestButton").click(function () {
        window.browser.runtime.sendMessage({
            message: "startTest",
            test: test,
        });
        $("#takeTest_instruction").html("<h2>Press the Button to continue!</h2>");
        $("#takeTest").css("display", "block");
        $("#loadTest").css("display", "none");
    });
    $("#url").click(function () {
        $("#url_target_wrapper").css("display", "block");
        $("#css_id_target_wrapper").css("display", "none");
        $("#separator").css("display", "none");
        storeCreateTestForm();
    });
    $("#toast").click(function () {
        $(this).fadeOut(500);
    });
    $("#css_id").click(function () {
        $("#url_target_wrapper").css("display", "none");
        $("#css_id_target_wrapper").css("display", "block");
        $("#separator").css("display", "none");
        storeCreateTestForm();
    });
    $("#both").click(function () {
        $("#url_target_wrapper").css("display", "block");
        $("#css_id_target_wrapper").css("display", "block");
        $("#separator").css("display", "block");
        storeCreateTestForm();

    });
    $("#instruction, .url_target, .css_id_target, #timeLimit").change(function () {
        storeCreateTestForm();
    });
    $("#add_url").click(function () {
        let counter = document.getElementsByClassName("url_target").length + 1;
        $("#url_target_wrapper > div").append("" +
            "<input placeholder=\"URL\" type=\"text\" id=\"url_target_" + counter + "\" class=\"url_target\"/>\n" +
            "<button type=\"button\"  id=\"use_url_target_" + counter + "\">Current URL</button>");
        setTimeout(function () {
            $("#use_url_target_" + counter).click(function () {
                window.browser.runtime.sendMessage({
                    message: "getURL",
                    counter: counter
                });
            });
            $(".url_target").change(function () {
                storeCreateTestForm();
            });
        }, 0);
    });
    $("#add_css_id").click(function () {
        let counter = document.getElementsByClassName("css_id_target").length + 1;
        $("#css_id_target_wrapper > div").append("" +
            "<input placeholder=\"CSS ID\" type=\"text\" id=\"css_id_target_" + counter + "\" class=\"css_id_target\"/>\n" +
            "<button type=\"button\"  id=\"use_css_id_target_" + counter + "\">Select Target</button>");
        setTimeout(function () {
            $("#use_css_id_target_" + counter).click(function () {
                window.browser.runtime.sendMessage({
                    message: "getCSSID",
                    counter: counter
                });

            });
            $(".css_id_target").change(function () {
                storeCreateTestForm();
            });
        }, 0);

    });
    $("#use_css_id_target_1").click(function () {
        window.browser.runtime.sendMessage({
            message: "getCSSID",
            counter: 1
        });
    });
    $("#use_url_target_1").click(function () {
        window.browser.runtime.sendMessage({
            message: "getURL",
            counter: 1
        });
    });
    /* the created test is downloaded as a .json file*/
    $("#download_json").click(function () {
        if (test.transfer_results.transfer_type === "email" && test.transfer_results.email === "") {
            displayToast("No E-Mail Address", "Please enter an E-Mail address where you want to receive the test results!", 5000);
            addShake("general_information");
            return;
        }
        if (test.transfer_results.transfer_type === "url" && test.transfer_results.url === "") {
            displayToast("No URL specified", "Please enter an URL where you want to receive the test results!", 5000);
            addShake("general_information");
            return;
        }
        if (test.test_title === "") {
            displayToast("No Test-Title specified", "Please enter a valid test title!", 5000);
            addShake("general_information");
            return;
        }
        if (test.tasks.length === 0) {
            displayToast("No Tasks specified", "Please add at least one task to the test!", 5000);
            addShake("create_new_task");
            return;
        }

        let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(test));
        let exportFileDefaultName = (test.test_title === "" ? "data" : test.test_title) + '.json';
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    /* a task is added to the test that is currently being created*/
    $("#addToTest").click(function () {
        let instruction = $("#instruction").val();
        let target_type = $('input[name="target_type"]:checked').val();
        let time = $("#timeLimit").val();
        var target_urls = [];
        var target_css_ids = [];
        var urls = document.getElementsByClassName("url_target");
        var css_id = document.getElementsByClassName("css_id_target");
        for (let i = 0; i < urls.length; i++) {
            if (urls[i].value !== "") {
                target_urls.push(urls[i].value);
            }
        }
        for (let i = 0; i < css_id.length; i++) {
            if (css_id[i].value.split('#').join(' ') !== "") {
                target_css_ids.push(css_id[i].value.split('#').join(' '));
            }
        }

        if (useTimeLimit === false || time === "") {
            time = "no_limit";
        }
        if (instruction === "") {
            displayToast("No Instruction specified", "Please enter an instruction for the tester!", 5000);
            addShake("create_new_task");
            return;
        }
        if ((target_type === "css_id" || target_type === "both") && target_css_ids.length === 0) {
            displayToast("No CSS ID specified", "Please enter at least one CSS ID!", 5000);
            addShake("create_new_task");
            return;
        }
        if ((target_type === "url" || target_type === "both") && target_urls.length === 0) {
            displayToast("No URL specified", "Please enter an at least one URL!", 5000);
            addShake("create_new_task");
            return;
        }

        $("#created_tasks, #created_tasks_header").css("display", "block");

        let target = {target_type: target_type, target_urls: target_urls, target_css_ids: target_css_ids};
        let task = {id: task_counter, instruction: instruction, time: time, target: target};
        test.tasks.push(task);
        task_counter++;
        $("#testTable").html(" <tr>\n" +
            "                        <th>Instruction</th>\n" +
            "                        <th>Target</th>\n" +
            "                        <th>Time Limit</th>\n" +
            "                        <th>Actions</th>\n" +
            "                    </tr>");
        displayCreatedTasks();
        storeCreateTestForm();
    });

    function displayCreatedTasks() {
        if (test.tasks.length > 0) {
            $("#created_tasks_header").css("display", "block");
            $("#created_tasks").css("display", "block");
        }
        for (let i = 0; i < test.tasks.length; i++) {
            test.tasks[i].id = i;
            var targets = "";
            if (test.tasks[i].target.target_type === "url") {
                targets = "URLs: <br/><strong>" + test.tasks[i].target.target_urls.join(", <br/><br/>") + "</strong>";
            } else if (test.tasks[i].target.target_type === "css_id") {
                targets = "CSS IDs: <br/><strong>#" + test.tasks[i].target.target_css_ids.join(" <br/><br/>#") + "</strong>";
            } else if (test.tasks[i].target.target_type === "both") {
                targets = (test.tasks[i].target.target_css_ids.length === 0 ? "None" : "CSS IDs: <br/><strong>#" + test.tasks[i].target.target_css_ids.join(" <br/><br/>#"))
                    + "</strong><br/> on these pages:<br/>" + (test.tasks[i].target.target_urls.length === 0 ? "<strong>None" : "URLs: <strong><br/>" + test.tasks[i].target.target_urls.join(", <br/><br/>")) + "</strong>";
            }
            $("#testTable").css("display", "table")
                .append("<tr><td>" + test.tasks[i].instruction + "</td><td>" + targets + "</td>" +
                    "<td>" + (test.tasks[i].time === "no_limit" ? "No Limit" : test.tasks[i].time + "sec") + "</td>" +
                    "<td><button class='remove_from_test' id='remove_from_test_" + i + "'><img width='15' src='img/garbage.svg' /></button></td></tr>");
        }
        setTimeout(function () {
            $(".remove_from_test").click(function () {
                let index = parseInt($(this).attr('id').split('remove_from_test_').join(''));
                test.tasks.splice(index, 1);
                $(this).parent().parent().remove();
                if (test.tasks.length === 0) {
                    $("#created_tasks, #created_tasks_header").css("display", "none");
                    $("#testTable").html(" ");

                } else {
                    $("#testTable").html(" <tr>\n" +
                        "                        <th>Instruction</th>\n" +
                        "                        <th>Target</th>\n" +
                        "                        <th>Time Limit</th>\n" +
                        "                        <th>Actions</th>\n" +
                        "                    </tr>");
                    displayCreatedTasks();
                }
            });
        }, 0);
    }

    $('#file_input').change(function (event) {
        let fileList = event.target.files;
        let file;
        for (let i = 0; i < fileList.length; i++) {
            var filetype = fileList[i].type;
            if (filetype === "application/json") {
                file = fileList[i];
                break;
            }
        }
        evalFile(file, filetype);
    });
    $("#takeTest_cancel").click(function () {
        $(this).css("display", "none");
        clearTimeout(countdown_timeout);
        sendToContentScript({messageType: "cancelTask"}, function (response) {
        });
    });
    $('#file_input_results').change(function (event) {
        let fileList = event.target.files;
        evalResultFiles(fileList);
    });
    $("#drop_zone, #drop_zone_results").on("dragover", function (event) {
        $(this).addClass("filesDraggedOver");
        event.preventDefault();
        event.stopPropagation();
    }).on("dragleave", function (event) {
        $(this).removeClass("filesDraggedOver");
        event.preventDefault();
        event.stopPropagation();
    }).on("drop", function (event) {
        event.preventDefault();
        event.stopPropagation();
        event = event.originalEvent;
        if ($(this).attr("id") === "drop_zone") {
            let file = null;
            for (let i = 0; i < event.dataTransfer.items.length; i++) {
                var filetype = event.dataTransfer.files[i].name.split('.').pop().toLowerCase();
                if (event.dataTransfer.items[i].kind === 'file' && filetype) {
                    file = event.dataTransfer.files[i];
                    break;
                }
            }
            evalFile(file, filetype);

        } else {
            evalResultFiles(event.dataTransfer.files);
        }
    });

    /* when sending a message to the background script or content script the possible response is handled here*/
    window.browser.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.reason === "startCountdown") {
                countdown();
                $("#takeTest_cancel").css("display", "block");
                sendResponse();
            } else if (request.reason === "endCountdown") {
                clearTimeout(countdown_timeout);
                $("#takeTest_cancel").css("display", "none");
                $("#takeTest_instruction > p").html("Time is up!");
                sendResponse();
            }
            else if (request.reason === "getURL") {
                $("#url_target_" + request.counter).val(request.url);
                storeCreateTestForm();
                sendResponse();
            } else if (request.reason === "updateState") {
                if (request.stored_task !== undefined && request.stored_task.target !== undefined) {
                    let task = request.stored_task;
                    $("#instruction").val(task.instruction);
                    $("#timeLimit").val(parseInt(task.time));
                    if (task.time_limit_visible) {
                        $("#timeLimitWrapping").css("display", "block");
                    } else {
                        $("#timeLimitWrapping").css("display", "none");
                    }
                    useTimeLimit = task.time_limit_visible;
                    $("#" + task.target.target_type).click();
                    let target_urls = task.target.target_urls;
                    for (let counter = 0; counter < target_urls.length; counter++) {
                        if (counter !== 0) {
                            $("#url_target_wrapper > div").append("" +
                                "<input placeholder=\"URL\" type=\"text\" value='" + target_urls[counter] + "' id=\"url_target_" + (counter + 1) + "\" class=\"url_target\"/>\n" +
                                "<button type=\"button\"  id=\"use_url_target_" + (counter + 1) + "\">Current URL</button>");
                            setTimeout(function () {
                                $("#use_url_target_" + (counter+1)).click(function () {
                                    window.browser.runtime.sendMessage({
                                        message: "getURL",
                                        counter: (counter+1)
                                    });
                                });
                                $(".url_target").change(function () {
                                    storeCreateTestForm();
                                });
                            }, 0);
                        } else {
                            $("#url_target_1").val(target_urls[0]);
                        }
                    }
                    let target_css_ids = task.target.target_css_ids;
                    for (let counter = 0; counter < target_css_ids.length; counter++) {
                        if (counter !== 0) {
                            $("#css_id_target_wrapper > div").append("" +
                                "<input placeholder=\"CSS ID\" type=\"text\" value='" + target_css_ids[counter] + "' id=\"css_id_target_" + (counter + 1) + "\" class=\"css_id_target\"/>\n" +
                                "<button type=\"button\"  id=\"use_css_id_target_" + (counter + 1) + "\">Select Target</button>");
                            setTimeout(function () {
                                $("#use_css_id_target_" + (counter + 1)).click(function () {
                                    window.browser.runtime.sendMessage({
                                        message: "getCSSID",
                                        counter: (counter +1)
                                    });
                                });
                                $(".css_id_target").change(function () {
                                    storeCreateTestForm();
                                });
                            }, 0);
                        } else {
                            $("#css_id_target_1").val(target_css_ids[0]);
                        }
                    }
                    if (task.target.message !== null && task.target.message !== undefined) {
                        displayToast("Info about the selected element!", task.target.message, -1);
                    }
                }
                if (request.stored_test !== undefined && request.stored_test.tasks !== undefined) {
                    task_counter = request.stored_test.tasks.length;
                    test = request.stored_test;
                    $("#test_title").val(test.test_title);
                    $("#transfer_method_" + test.transfer_results.transfer_type).click();
                    $("#test_url").val(test.transfer_results.url);
                    $("#test_email").val(test.transfer_results.email);
                    displayCreatedTasks();
                }

                if (request.state === "task") {
                    $("#takeTest").css("display", "block");
                    $("main").css("display", "none");
                    clearTimeout(countdown_timeout);
                    $("#takeTest_cancel").css("display", "block");
                    if (request.task.time !== "no_limit") {
                        endTime = new Date();
                        let startTime = new Date(request.startTime);
                        var timeDiff = endTime - startTime;
                        timeDiff /= 1000;
                        let remaining_time = Math.round(request.task.time - timeDiff);
                        $("#takeTest_instruction").html("<h2> " + request.task.instruction + "</h2><p  class='countdown'>You have <span id='remaining_seconds'>" + (remaining_time >= 0 ? remaining_time : 0) + "</span> seconds left to complete the task</p>");
                        countdown();
                    } else {
                        $("#takeTest_instruction").html("<h2>" + request.task.instruction + "</h2><p class='countdown'>You have no time limit to complete the task</p>");
                    }
                } else if (request.state === "start") {
                    $("#takeTest").css("display", "block");
                    $("main").css("display", "none");
                } else if (request.state === "end") {
                    $("#takeTest").css("display", "block");
                    $("main").css("display", "none");
                    $("#takeTest_cancel").css("display", "none");
                    $("#backButton").click();
                    clearTimeout(countdown_timeout);
                } else if (request.state === "createTest") {
                    $("#createTest").css("display", "block");
                    $("main").css("display", "none");
                } else if (request.state === "createSummary") {
                    $("#loadResults").css("display", "block");
                    $("main").css("display", "none");
                } else if (request.state === "takeTest") {
                    $("#loadTest").css("display", "block");
                    $("main").css("display", "none");
                } else if (request.state === "about") {
                    $("#about").css("display", "block");
                    $("main").css("display", "none");
                } else if (request.state !== "" && request.state !== "none" && request.state !== undefined) {
                    $("#takeTest").css("display", "block");
                    $("main").css("display", "none");
                }
                sendResponse();
            }
            else if(request.reason === "displayMessage") {
                displayToast(request.mesTitle, request.mesBody, request.mesTime);
                sendResponse();
            }
            else {
                sendResponse();
            }
        }
    );

    /* when the extension is opened, it is checked if a prior state was stored in the background script*/
    window.browser.runtime.sendMessage({
        message: "getState"
    });

});





