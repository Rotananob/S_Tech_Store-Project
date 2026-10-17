<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Registers custom PostgreSQL operators so queries comparing VARCHAR columns (like sale_price, price)
     * with integers/numerics will not throw SQLSTATE[42883] "operator does not exist: character varying > integer".
     */
    public function up(): void
    {
        if (config('database.default') !== 'pgsql') {
            return;
        }

        try {
            DB::statement("
                CREATE OR REPLACE FUNCTION public.varchar_gt_int(val character varying, num integer)
                RETURNS boolean AS \$\$
                BEGIN
                    IF val IS NULL OR val = '' THEN RETURN false; END IF;
                    IF val ~ '^[0-9]+(\.[0-9]+)?\$' THEN
                        RETURN (val::numeric > num);
                    END IF;
                    RETURN false;
                EXCEPTION WHEN OTHERS THEN
                    RETURN false;
                END;
                \$\$ LANGUAGE plpgsql IMMUTABLE;
            ");

            DB::statement("
                CREATE OR REPLACE FUNCTION public.varchar_gt_numeric(val character varying, num numeric)
                RETURNS boolean AS \$\$
                BEGIN
                    IF val IS NULL OR val = '' THEN RETURN false; END IF;
                    IF val ~ '^[0-9]+(\.[0-9]+)?\$' THEN
                        RETURN (val::numeric > num);
                    END IF;
                    RETURN false;
                EXCEPTION WHEN OTHERS THEN
                    RETURN false;
                END;
                \$\$ LANGUAGE plpgsql IMMUTABLE;
            ");

            DB::statement("
                DO \$\$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_operator o
                        JOIN pg_type t1 ON o.oprleft = t1.oid
                        JOIN pg_type t2 ON o.oprright = t2.oid
                        WHERE o.oprname = '>' AND t1.typname = 'varchar' AND t2.typname = 'int4'
                    ) THEN
                        CREATE OPERATOR public.> (
                            LEFTARG = character varying,
                            RIGHTARG = integer,
                            PROCEDURE = public.varchar_gt_int
                        );
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_operator o
                        JOIN pg_type t1 ON o.oprleft = t1.oid
                        JOIN pg_type t2 ON o.oprright = t2.oid
                        WHERE o.oprname = '>' AND t1.typname = 'varchar' AND t2.typname = 'numeric'
                    ) THEN
                        CREATE OPERATOR public.> (
                            LEFTARG = character varying,
                            RIGHTARG = numeric,
                            PROCEDURE = public.varchar_gt_numeric
                        );
                    END IF;
                END;
                \$\$;
            ");
        } catch (\Throwable $e) {
            // Ignore if operators or functions already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe no-op to maintain database stability
    }
};
