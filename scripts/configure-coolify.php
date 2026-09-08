<?php
// Executar exclusivamente no container Coolify, com JSON pelo stdin. Nunca imprime valores.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$selfTest = in_array('--self-test', $argv ?? [], true);
$stage = 'input';
try {
    $input = $selfTest ? ['token' => str_repeat('TESTONLY', 12), 'appSecret' => str_repeat('0', 32)] : json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
    if (!preg_match('/^[A-Za-z0-9_-]{80,4096}$/', $input['token'] ?? '') || !preg_match('/^[a-f0-9]{32}$/i', $input['appSecret'] ?? '')) throw new Exception('invalid');
    $stage = 'target';
    $resource = App\Models\Application::where('uuid', 'dwa4hpiceg215vtuh5je4spr')->firstOrFail();
    if ($resource->id !== 7) throw new Exception('target');
    $values = [
        'WHATSAPP_TOKEN' => $input['token'], 'WHATSAPP_APP_SECRET' => $input['appSecret'],
        'WHATSAPP_PHONE_NUMBER_ID' => '1285831901288878', 'WHATSAPP_PUBLIC_NUMBER' => '5511952133575',
        'ASAAS_BILLING_ENABLED' => 'false', 'ASAAS_VALOR_ASSINATURA' => '97',
    ];
    foreach (['WHATSAPP_VERIFY_TOKEN', 'INTERNAL_JOB_TOKEN'] as $key) {
        $exists = App\Models\EnvironmentVariable::where('resourceable_type', App\Models\Application::class)->where('resourceable_id', 7)->where('is_preview', false)->where('key', $key)->first();
        if (!$exists || !$exists->value) $values[$key] = bin2hex(random_bytes(32));
    }
    $stage = 'database';
    if ($selfTest) Illuminate\Support\Facades\DB::beginTransaction();
    Illuminate\Support\Facades\DB::transaction(function () use ($values) {
        // Evitar copiar segredos de produção para ambientes de preview no hook created do Coolify.
        App\Models\EnvironmentVariable::withoutEvents(function () use ($values) {
            foreach ($values as $key => $value) {
                $environment = App\Models\EnvironmentVariable::firstOrNew([
                    'resourceable_type' => App\Models\Application::class, 'resourceable_id' => 7,
                    'is_preview' => false, 'key' => $key,
                ]);
                // withoutEvents também desativa a geração de UUID do BaseModel.
                if (!$environment->exists) $environment->uuid = new_public_id();
                $environment->fill(['value' => $value, 'is_buildtime' => false, 'is_runtime' => true, 'is_literal' => false,
                    'is_multiline' => false, 'version' => config('constants.coolify.version')]);
                $environment->save();
            }
        });
    });
    if ($selfTest) Illuminate\Support\Facades\DB::rollBack();
    echo json_encode(['ok' => true, 'selfTest' => $selfTest, 'configuredKeys' => array_keys($values)]);
} catch (Throwable $error) {
    // Não imprimir exceção/SQL/entrada: podem incluir credenciais.
    if ($selfTest && Illuminate\Support\Facades\DB::transactionLevel() > 0) Illuminate\Support\Facades\DB::rollBack();
    echo json_encode(['ok' => false, 'stage' => $stage, 'errorClass' => get_class($error), 'code' => (string) $error->getCode()]);
    exit(1);
}
