<?php
header('Access-Control-Allow-Methods: GET, POST');

// تحميل الإعدادات من الملف الخارجي
$config = require 'config.php';
$telegramBotToken = $config['telegramBotToken'];
$telegramChatIds = $config['telegramChatIds'];
$dbConfig = $config['db'];

function sendTelegramMessage($token, $chatIds, $message) {
    $successCount = 0;
    $failureCount = 0;

    foreach ($chatIds as $chatId) {
        $url = "https://api.telegram.org/bot{$token}/sendMessage";
        
        $postData = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        curl_close($ch);
        
        // حساب عدد الإرسالات الناجحة والفاشلة
        if ($httpCode == 200) {
            $successCount++;
        } else {
            $failureCount++;
        }
    }

    return [
        'success' => $successCount,
        'failure' => $failureCount,
        'total' => count($chatIds)
    ];
}

// التحقق من أن الطلب هو POST وأنه يحتوي على بيانات JSON
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // استقبال محتوى JSON
    $jsonInput = file_get_contents('php://input');
    
    // فك تشفير البيانات JSON
    $data = json_decode($jsonInput, true);
    
    file_put_contents("debug.log", date("Y-m-d H:i:s") . " - Received: " . $jsonInput . "\n", FILE_APPEND);

    // التأكد من أن JSON صالح
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
        exit();
    }

    // تعيين القيمة الافتراضية لـ area إذا كانت فارغة
    $data['area'] = !empty($data['area']) ? $data['area'] : "INTERCITY CLUB";

    // التحقق من الحقول المطلوبة
    if (!isset($data['valuation'], $data['name'], $data['phone'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "بيانات غير صالحة"]);
        exit();
    }

    // تحويل التقييم إلى عدد صحيح
    $data['valuation'] = (int) $data['valuation'];

    // التحقق من صحة البيانات
    if (
        isset($data['area']) && is_string($data['area']) &&
        isset($data['valuation']) && is_int($data['valuation']) &&
        isset($data['note']) && is_string($data['note']) &&
        isset($data['name']) && is_string($data['name']) &&
        isset($data['phone']) && is_string($data['phone'])
    ) {
        // إعدادات الاتصال بقاعدة البيانات
        $servername = $dbConfig['servername'];
        $username = $dbConfig['username'];
        $password = $dbConfig['password'];
        $dbname = $dbConfig['dbname'];

        // إنشاء اتصال
        $conn = new mysqli($servername, $username, $password, $dbname);

        // التحقق من الاتصال
        if ($conn->connect_error) {
            die("فشل الاتصال: " . $conn->connect_error);
        }

        // إعداد استعلام SQL للإدراج
        $stmt = $conn->prepare("INSERT INTO properties 
            (area, valuation, note, name, phone) 
            VALUES (?, ?, ?, ?, ?)");
        
        // ربط المتغيرات
        $stmt->bind_param(
            "sisss", 
            $data['area'], 
            $data['valuation'], 
            $data['note'], 
            $data['name'], 
            $data['phone']
        );

        // تنفيذ الاستعلام
        if ($stmt->execute()) {
            // تجهيز رسالة Telegram
            $message = "<b>تم استلام تقييم جديد</b>\n\n" .
                       "المنطقة: {$data['area']}\n" .
                       "التقييم: {$data['valuation']}\n" .
                       "ملاحظات: {$data['note']}\n" .
                       "الاسم: {$data['name']}\n" .
                       "الهاتف: {$data['phone']}";

            // إرسال رسالة Telegram
            $telegramResult = sendTelegramMessage(
                $telegramBotToken, 
                $telegramChatIds, 
                $message
            );

            // إرسال رد بنجاح العملية
            http_response_code(201);
            echo json_encode([
                'status' => 'success', 
                'message' => 'تم حفظ البيانات وإرسال الإشعار',
                'telegram_result' => $telegramResult
            ]);
        } else {
            // إرسال رد بفشل الإدراج
            http_response_code(500);
            echo json_encode([
                'status' => 'error', 
                'message' => 'فشل في حفظ البيانات'
            ]);
        }

        // إغلاق الاتصال
        $stmt->close();
        $conn->close();
    } else {
        // رد بخطأ التحقق من صحة البيانات
        http_response_code(400);
        echo json_encode([
            'status' => 'error', 
            'message' => 'بيانات غير صالحة'
        ]);
    }
} else {
    // رد بخطأ طريقة الطلب غير الصحيحة
    http_response_code(405);
    echo json_encode([
        'status' => 'error', 
        'message' => 'الطريقة غير مسموح بها'
    ]);
}
?>