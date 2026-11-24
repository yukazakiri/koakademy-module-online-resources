<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;
use Modules\OnlineResources\Contracts\OnlineResourceScopeHandler;
use Modules\OnlineResources\Models\OnlineResourceCategory;

final class OnlineResourceScopeRegistry
{
    /** @var array<string, OnlineResourceScopeHandler> */
    private array $handlers = [];

    /** @var array<class-string<Model>, string> */
    private array $modelToKey = [];

    public function register(OnlineResourceScopeHandler $handler): void
    {
        $this->handlers[$handler->key()] = $handler;
        $this->modelToKey[$handler->modelClass()] = $handler->key();
    }

    public function has(string $key): bool
    {
        return isset($this->handlers[$key]);
    }

    public function forKey(string $key): OnlineResourceScopeHandler
    {
        if (! isset($this->handlers[$key])) {
            throw new InvalidArgumentException("Online resource scope [{$key}] is not registered.");
        }

        return $this->handlers[$key];
    }

    public function forModel(Model $owner): OnlineResourceScopeHandler
    {
        $key = $this->modelToKey[$owner::class] ?? null;

        if ($key === null) {
            throw new InvalidArgumentException('No online resource scope registered for model ['.$owner::class.'].');
        }

        return $this->handlers[$key];
    }

    public function forCategory(OnlineResourceCategory $category): OnlineResourceScopeHandler
    {
        return $this->forKey($category->owner_type);
    }

    public function resolveOwner(OnlineResourceCategory $category): ?Model
    {
        if (! $this->has($category->owner_type)) {
            return null;
        }

        return $this->forKey($category->owner_type)->findOwner($category->owner_id);
    }

    /**
     * @return list<string>
     */
    public function keys(): array
    {
        return array_keys($this->handlers);
    }
}
