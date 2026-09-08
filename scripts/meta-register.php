<?php
// Registro restrito à linha PedreirosBR. Segredos permanecem no Coolify/HTTPS Meta.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    $target = App\Models\Application::where('uuid', 'dwa4hpiceg215vtuh5je4spr')->firstOrFail();
    if ($target->id !== 7) throw new Exception('target');
    $query = fn () => App\Models\EnvironmentVariable::where('resourceable_type', App\Models\Application::class)->where('resourceable_id', 7)->where('is_preview', false);
    $token = $query()->where('key', 'WHATSAPP_TOKEN')->firstOrFail()->value;
    $http = fn () => Illuminate\Support\Facades\Http::withToken($token)->timeout(25);
    $url = 'https://graph.facebook.com/v21.0/1285831901288878';
    $before = $http()->get($url, ['fields' => 'id,display_phone_number,status,code_verification_status'])->json();
    if (($before['id'] ?? '') !== '1285831901288878' || preg_replace('/\D/', '', $before['display_phone_number'] ?? '') !== '5511952133575') throw new Exception('phone_mismatch');
    if (($before['status'] ?? '') === 'CONNECTED') { echo '{"ok":true,"alreadyConnected":true}'; exit; }
    if (($before['code_verification_status'] ?? '') !== 'VERIFIED') throw new Exception('not_verified');
    $pin = $query()->where('key', 'WHATSAPP_REGISTRATION_PIN')->first();
    if (!$pin) {
        $pin = new App\Models\EnvironmentVariable();
        $pin->uuid = new_public_id();
        $pin->fill(['key' => 'WHATSAPP_REGISTRATION_PIN', 'value' => str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT),
            'resourceable_type' => App\Models\Application::class, 'resourceable_id' => 7, 'is_preview' => false,
            'is_runtime' => false, 'is_buildtime' => false, 'is_literal' => false, 'is_multiline' => false, 'version' => config('constants.coolify.version')]);
        App\Models\EnvironmentVariable::withoutEvents(fn () => $pin->save());
    }
    // Nenhum retry automático: uma resposta ambígua exige consultar status antes de repetir.
    $response = $http()->post($url.'/register', ['messaging_product' => 'whatsapp', 'pin' => $pin->value]);
    $body = $response->json();
    echo json_encode(['ok' => $response->successful() && ($body['success'] ?? false), 'httpStatus' => $response->status(),
        'errorCode' => $body['error']['code'] ?? null, 'errorSubcode' => $body['error']['error_subcode'] ?? null]);
} catch (Throwable $error) {
    echo json_encode(['ok' => false, 'errorClass' => get_class($error)]);
    exit(1);
}
