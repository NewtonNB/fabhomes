<?php

namespace App\Services\Gateways;

use App\Models\PaymentGatewayConfig;
use App\Services\Gateways\Contracts\PaymentGatewayInterface;
use InvalidArgumentException;

class PaymentGatewayManager
{
    protected array $adapters = [];

    public function __construct()
    {
        $this->registerAdapter('flutterwave', FlutterwaveAdapter::class);
        $this->registerAdapter('pesapal', PesapalAdapter::class);
        $this->registerAdapter('mtn_momo', DirectMobileMoneyAdapter::class);
        $this->registerAdapter('airtel_money', DirectMobileMoneyAdapter::class);
        $this->registerAdapter('bank_transfer', BankTransferAdapter::class);
    }

    public function registerAdapter(string $name, string $adapterClass): self
    {
        $this->adapters[$name] = $adapterClass;
        return $this;
    }

    /**
     * Resolve the gateway adapter instance for a given provider name.
     */
    public function driver(?string $name = null): PaymentGatewayInterface
    {
        $name = $name ?: $this->getDefaultGatewayName();

        if (!isset($this->adapters[$name])) {
            throw new InvalidArgumentException("Unsupported payment gateway driver: [{$name}]");
        }

        $config = PaymentGatewayConfig::where('name', $name)->first();
        $adapterClass = $this->adapters[$name];

        return new $adapterClass($config);
    }

    /**
     * Get the configured default gateway name.
     */
    public function getDefaultGatewayName(): string
    {
        $default = PaymentGatewayConfig::where('is_active', true)
            ->where('is_default', true)
            ->first();

        return $default?->name ?? 'flutterwave';
    }

    /**
     * Get list of all registered drivers.
     */
    public function getRegisteredDrivers(): array
    {
        return array_keys($this->adapters);
    }
}
