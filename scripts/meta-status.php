<?php
// Diagnóstico somente leitura. Executar no Coolify; nunca emitir tokens ou respostas brutas.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    $environment = App\Models\EnvironmentVariable::where('resourceable_type', App\Models\Application::class)
        ->where('resourceable_id', 7)->where('is_preview', false)->where('key', 'WHATSAPP_TOKEN')->firstOrFail();
    $fields = ['id', 'display_phone_number', 'verified_name', 'code_verification_status', 'status', 'platform_type', 'name_status'];
    $response = Illuminate\Support\Facades\Http::withToken($environment->value)->timeout(20)
        ->get('https://graph.facebook.com/v21.0/1285831901288878', ['fields' => implode(',', $fields)]);
    $data = $response->json();
    $result = ['httpStatus' => $response->status(), 'ok' => $response->successful()];
    if ($response->successful()) {
        foreach ($fields as $field) if (isset($data[$field]) && is_scalar($data[$field])) $result[$field] = $data[$field];
    } else {
        $result['errorCode'] = $data['error']['code'] ?? null;
        $result['errorSubcode'] = $data['error']['error_subcode'] ?? null;
        $result['errorType'] = $data['error']['type'] ?? null;
    }
    echo json_encode($result);
} catch (Throwable $error) {
    echo json_encode(['ok' => false, 'errorClass' => get_class($error)]);
    exit(1);
}
