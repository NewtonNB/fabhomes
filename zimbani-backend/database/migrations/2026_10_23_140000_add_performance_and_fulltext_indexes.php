<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Helper to check if an index exists on a table.
     */
    protected function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $dbName = $connection->getDatabaseName();
        
        $result = DB::select(
            "SELECT COUNT(1) as count FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
            [$dbName, $table, $indexName]
        );

        return !empty($result) && $result[0]->count > 0;
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Transactions Performance & Composite Indexes
        if (Schema::hasTable('transactions')) {
            Schema::table('transactions', function (Blueprint $table) {
                if (!$this->indexExists('transactions', 'idx_tx_status_type_date')) {
                    $table->index(['status', 'transaction_type', 'transaction_date'], 'idx_tx_status_type_date');
                }
                if (!$this->indexExists('transactions', 'idx_tx_client_status_date')) {
                    $table->index(['client_id', 'status', 'transaction_date'], 'idx_tx_client_status_date');
                }
                if (!$this->indexExists('transactions', 'idx_tx_ref_status')) {
                    $table->index(['reference_number', 'status'], 'idx_tx_ref_status');
                }
                if (!$this->indexExists('transactions', 'ft_transactions_search')) {
                    $table->fullText(['description', 'reference_number', 'transaction_number'], 'ft_transactions_search');
                }
            });
        }

        // 2. Payments Performance & Composite Indexes
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (!$this->indexExists('payments', 'idx_payments_client_status_date')) {
                    $table->index(['client_id', 'status', 'payment_date'], 'idx_payments_client_status_date');
                }
                if (!$this->indexExists('payments', 'idx_payments_method_status_date')) {
                    $table->index(['payment_method', 'status', 'payment_date'], 'idx_payments_method_status_date');
                }
                if (!$this->indexExists('payments', 'ft_payments_search')) {
                    $table->fullText(['payment_number', 'reference_number', 'notes'], 'ft_payments_search');
                }
            });
        }

        // 3. Savings Accounts Composite Indexes
        if (Schema::hasTable('savings_accounts')) {
            Schema::table('savings_accounts', function (Blueprint $table) {
                if (!$this->indexExists('savings_accounts', 'idx_savings_client_type_status')) {
                    $table->index(['client_id', 'account_type', 'status'], 'idx_savings_client_type_status');
                }
                if (!$this->indexExists('savings_accounts', 'idx_savings_status_target_date')) {
                    $table->index(['status', 'target_date'], 'idx_savings_status_target_date');
                }
            });
        }

        // 4. App Notifications Composite Indexes
        if (Schema::hasTable('app_notifications')) {
            Schema::table('app_notifications', function (Blueprint $table) {
                if (!$this->indexExists('app_notifications', 'idx_notif_user_cat_read_created')) {
                    $table->index(['user_id', 'category', 'read_at', 'created_at'], 'idx_notif_user_cat_read_created');
                }
            });
        }

        // 5. Units Performance & FullText Indexes
        if (Schema::hasTable('units')) {
            Schema::table('units', function (Blueprint $table) {
                if (!$this->indexExists('units', 'idx_units_site_status_type')) {
                    $table->index(['site_id', 'status', 'unit_type'], 'idx_units_site_status_type');
                }
                if (!$this->indexExists('units', 'idx_units_block_unit')) {
                    $table->index(['block_number', 'unit_number'], 'idx_units_block_unit');
                }
                if (!$this->indexExists('units', 'ft_units_search')) {
                    $table->fullText(['name', 'unit_number', 'description'], 'ft_units_search');
                }
            });
        }

        // 6. Documents Performance & FullText Indexes
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (!$this->indexExists('documents', 'idx_docs_type_status_created')) {
                    $table->index(['document_type', 'status', 'created_at'], 'idx_docs_type_status_created');
                }
                if (!$this->indexExists('documents', 'ft_documents_search')) {
                    $table->fullText(['title', 'document_number', 'file_name'], 'ft_documents_search');
                }
            });
        }

        // 7. Security Audit Logs Composite Indexes
        if (Schema::hasTable('security_audit_logs')) {
            Schema::table('security_audit_logs', function (Blueprint $table) {
                if (!$this->indexExists('security_audit_logs', 'idx_audit_event_severity_created')) {
                    $table->index(['event_type', 'severity', 'created_at'], 'idx_audit_event_severity_created');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('transactions')) {
            Schema::table('transactions', function (Blueprint $table) {
                if ($this->indexExists('transactions', 'idx_tx_status_type_date')) $table->dropIndex('idx_tx_status_type_date');
                if ($this->indexExists('transactions', 'idx_tx_client_status_date')) $table->dropIndex('idx_tx_client_status_date');
                if ($this->indexExists('transactions', 'idx_tx_ref_status')) $table->dropIndex('idx_tx_ref_status');
                if ($this->indexExists('transactions', 'ft_transactions_search')) $table->dropIndex('ft_transactions_search');
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if ($this->indexExists('payments', 'idx_payments_client_status_date')) $table->dropIndex('idx_payments_client_status_date');
                if ($this->indexExists('payments', 'idx_payments_method_status_date')) $table->dropIndex('idx_payments_method_status_date');
                if ($this->indexExists('payments', 'ft_payments_search')) $table->dropIndex('ft_payments_search');
            });
        }

        if (Schema::hasTable('savings_accounts')) {
            Schema::table('savings_accounts', function (Blueprint $table) {
                if ($this->indexExists('savings_accounts', 'idx_savings_client_type_status')) $table->dropIndex('idx_savings_client_type_status');
                if ($this->indexExists('savings_accounts', 'idx_savings_status_target_date')) $table->dropIndex('idx_savings_status_target_date');
            });
        }

        if (Schema::hasTable('app_notifications')) {
            Schema::table('app_notifications', function (Blueprint $table) {
                if ($this->indexExists('app_notifications', 'idx_notif_user_cat_read_created')) $table->dropIndex('idx_notif_user_cat_read_created');
            });
        }

        if (Schema::hasTable('units')) {
            Schema::table('units', function (Blueprint $table) {
                if ($this->indexExists('units', 'idx_units_site_status_type')) $table->dropIndex('idx_units_site_status_type');
                if ($this->indexExists('units', 'idx_units_block_unit')) $table->dropIndex('idx_units_block_unit');
                if ($this->indexExists('units', 'ft_units_search')) $table->dropIndex('ft_units_search');
            });
        }

        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if ($this->indexExists('documents', 'idx_docs_type_status_created')) $table->dropIndex('idx_docs_type_status_created');
                if ($this->indexExists('documents', 'ft_documents_search')) $table->dropIndex('ft_documents_search');
            });
        }

        if (Schema::hasTable('security_audit_logs')) {
            Schema::table('security_audit_logs', function (Blueprint $table) {
                if ($this->indexExists('security_audit_logs', 'idx_audit_event_severity_created')) $table->dropIndex('idx_audit_event_severity_created');
            });
        }
    }
};
