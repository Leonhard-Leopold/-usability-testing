<?php
header("Access-Control-Allow-Origin: *");
if(isset($_POST['result'])){
    header("Access-Control-Allow-Origin: *");
    $result = $_POST['result'];
    $name = "test_results_".$_POST['test_title']."_".$_POST['tester_id'].".json";
    if(file_put_contents($name,$result)){
        echo $name." was saved successfully";
    }
    else{
        echo $name." was NOT saved successfully";
    }
}
?>
