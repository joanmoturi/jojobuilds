export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ready */
        get: operations["ready_ready_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["login_api_v1_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/mobile-login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mobile Login */
        post: operations["mobile_login_api_v1_auth_mobile_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Session */
        get: operations["session_api_v1_auth_session_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["logout_api_v1_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/recover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Recover */
        post: operations["recover_api_v1_auth_recover_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/redeem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Redeem */
        post: operations["redeem_api_v1_auth_redeem_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/accept-invitation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Accept Invitation */
        post: operations["accept_invitation_api_v1_auth_accept_invitation_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Invite */
        post: operations["invite_api_v1_invitations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Members */
        get: operations["members_api_v1_members_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/members/{member_id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Deactivate */
        post: operations["deactivate_api_v1_members__member_id__deactivate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Notifications */
        get: operations["notifications_api_v1_notifications_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/{notification_id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Read Notification */
        post: operations["read_notification_api_v1_notifications__notification_id__read_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/properties": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Properties */
        get: operations["properties_api_v1_properties_get"];
        put?: never;
        /** Create Property */
        post: operations["create_property_api_v1_properties_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/properties/{property_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update Property */
        put: operations["update_property_api_v1_properties__property_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/units": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Units */
        get: operations["units_api_v1_units_get"];
        put?: never;
        /** Create Unit */
        post: operations["create_unit_api_v1_units_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/units/{unit_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update Unit */
        put: operations["update_unit_api_v1_units__unit_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tenants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tenants */
        get: operations["tenants_api_v1_tenants_get"];
        put?: never;
        /** Create Tenant */
        post: operations["create_tenant_api_v1_tenants_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tenancies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tenancies */
        get: operations["tenancies_api_v1_tenancies_get"];
        put?: never;
        /** Create Tenancy */
        post: operations["create_tenancy_api_v1_tenancies_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/rentals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Rentals */
        get: operations["rentals_api_v1_rentals_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tenancies/{tenancy_id}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** End Tenancy */
        post: operations["end_tenancy_api_v1_tenancies__tenancy_id__end_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dashboard */
        get: operations["dashboard_api_v1_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Integrations */
        get: operations["integrations_api_v1_integrations_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Audit History */
        get: operations["audit_history_api_v1_audit_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/charges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Charges */
        get: operations["charges_api_v1_charges_get"];
        put?: never;
        /** Create Charge */
        post: operations["create_charge_api_v1_charges_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/billing/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate */
        post: operations["generate_api_v1_billing_generate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Payments */
        get: operations["payments_api_v1_payments_get"];
        put?: never;
        /** Create Payment */
        post: operations["create_payment_api_v1_payments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/{payment_id}/reverse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reverse */
        post: operations["reverse_api_v1_payments__payment_id__reverse_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Imports */
        get: operations["imports_api_v1_imports_get"];
        put?: never;
        /** Commit Import */
        post: operations["commit_import_api_v1_imports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview */
        post: operations["preview_api_v1_imports_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{batch_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Import */
        get: operations["download_import_api_v1_imports__batch_id__download_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reconciliation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Reconciliation */
        get: operations["reconciliation_api_v1_reconciliation_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reconciliation/{transaction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide */
        post: operations["decide_api_v1_reconciliation__transaction_id__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/exports/ledger.csv": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Ledger */
        get: operations["export_ledger_api_v1_exports_ledger_csv_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/maintenance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Maintenance */
        get: operations["maintenance_api_v1_maintenance_get"];
        put?: never;
        /** Create Maintenance */
        post: operations["create_maintenance_api_v1_maintenance_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/maintenance-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Maintenance Options */
        get: operations["maintenance_options_api_v1_maintenance_options_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/maintenance/{request_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Update Maintenance */
        post: operations["update_maintenance_api_v1_maintenance__request_id__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Attachments */
        get: operations["attachments_api_v1_attachments_get"];
        put?: never;
        /** Upload Attachment */
        post: operations["upload_attachment_api_v1_attachments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/attachments/{attachment_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Attachment */
        get: operations["download_attachment_api_v1_attachments__attachment_id__download_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Providers */
        get: operations["providers_api_v1_providers_get"];
        put?: never;
        /** Create Provider */
        post: operations["create_provider_api_v1_providers_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/providers/{provider_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update Provider */
        put: operations["update_provider_api_v1_providers__provider_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payables": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Payables */
        get: operations["payables_api_v1_payables_get"];
        put?: never;
        /** Create Payable */
        post: operations["create_payable_api_v1_payables_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payables/{payable_id}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Pay Payable */
        post: operations["pay_payable_api_v1_payables__payable_id__payments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payables/{payable_id}/void": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Void Payable */
        post: operations["void_payable_api_v1_payables__payable_id__void_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/outgoing-payments/{payment_id}/reverse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reverse Outgoing */
        post: operations["reverse_outgoing_api_v1_outgoing_payments__payment_id__reverse_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/recurring-charges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Recurring Charges */
        get: operations["recurring_charges_api_v1_recurring_charges_get"];
        put?: never;
        /** Create Recurring */
        post: operations["create_recurring_api_v1_recurring_charges_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/recurring-charges/{rule_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update Recurring */
        put: operations["update_recurring_api_v1_recurring_charges__rule_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/owner-finances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Owner Finances */
        get: operations["owner_finances_api_v1_owner_finances_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AllocationOut */
        AllocationOut: {
            /** Charge Id */
            charge_id: string;
            /** Amount */
            amount: number;
        };
        /** Bill */
        Bill: {
            /** Period */
            period: string;
        };
        /** Body_commit_import_api_v1_imports_post */
        Body_commit_import_api_v1_imports_post: {
            /** File */
            file: string;
            /** Mapping */
            mapping: string;
            /** Property Id */
            property_id: string;
            /** Account */
            account: string;
        };
        /** Body_preview_api_v1_imports_preview_post */
        Body_preview_api_v1_imports_preview_post: {
            /** File */
            file: string;
            /**
             * Mapping
             * @default
             */
            mapping: string;
        };
        /** Body_upload_attachment_api_v1_attachments_post */
        Body_upload_attachment_api_v1_attachments_post: {
            /** File */
            file: string;
            /** Property Id */
            property_id: string;
            /**
             * Tenancy Id
             * @default
             */
            tenancy_id: string;
            /**
             * Maintenance Id
             * @default
             */
            maintenance_id: string;
        };
        /** ChargeIn */
        ChargeIn: {
            /** Tenancy Id */
            tenancy_id: string;
            /** Period */
            period: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "rent" | "water" | "garbage" | "service" | "deposit" | "opening" | "adjustment";
            /** Description */
            description: string;
            /** Amount */
            amount: number;
            /**
             * Due Date
             * Format: date
             */
            due_date: string;
        };
        /** ChargeOut */
        ChargeOut: {
            /** Id */
            id: string;
            /** Tenancy Id */
            tenancy_id: string;
            /** Period */
            period: string;
            /** Kind */
            kind: string;
            /** Description */
            description: string;
            /** Amount */
            amount: number;
            /** Currency */
            currency: string;
            /**
             * Due Date
             * Format: date
             */
            due_date: string;
            /** Allocated */
            allocated: number;
            /** Balance */
            balance: number;
            /** Overdue */
            overdue: boolean;
        };
        /** DashboardOut */
        DashboardOut: {
            /** Period */
            period: string;
            /** Currency */
            currency: string;
            /** Properties */
            properties: number;
            /** Units */
            units: number;
            /** Occupied */
            occupied: number;
            /** Billed */
            billed: number;
            /** Allocated */
            allocated: number;
            /** Outstanding */
            outstanding: number;
            /** Overdue */
            overdue: number;
            /** Cash Received */
            cash_received: number;
            /** Unallocated Credit */
            unallocated_credit: number;
            /** Pending Review */
            pending_review: number;
            /** Maintenance Open */
            maintenance_open: number;
            /** Last Import */
            last_import: string | null;
            /** Statement Refresh Due */
            statement_refresh_due: boolean;
            /** Demo */
            demo: boolean;
        };
        /** Decision */
        Decision: {
            /**
             * Action
             * @enum {string}
             */
            action: "confirm" | "reject" | "defer";
            /** Tenancy Id */
            tenancy_id?: string | null;
            /** Reason */
            reason: string;
        };
        /** EndTenancy */
        EndTenancy: {
            /**
             * End Date
             * Format: date
             */
            end_date: string;
            /** Reason */
            reason: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** Invite */
        Invite: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /**
             * Role
             * @enum {string}
             */
            role: "owner" | "manager" | "agent" | "caretaker" | "maintenance" | "finance" | "tenant";
            /** Property Ids */
            property_ids?: string[];
            /** Tenant Id */
            tenant_id?: string | null;
        };
        /** Login */
        Login: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
        };
        /** MaintenanceIn */
        MaintenanceIn: {
            /** Property Id */
            property_id: string;
            /** Tenancy Id */
            tenancy_id?: string | null;
            /** Title */
            title: string;
            /** Description */
            description: string;
            /**
             * Category
             * @default General
             */
            category: string;
            /**
             * Priority
             * @default normal
             * @enum {string}
             */
            priority: "low" | "normal" | "high" | "urgent";
        };
        /** MaintenanceOptionOut */
        MaintenanceOptionOut: {
            /** Id */
            id: string;
            /** Tenant Name */
            tenant_name: string;
            /** Unit */
            unit: string;
            /** Unit Id */
            unit_id: string;
            /** Property Id */
            property_id: string;
            /** Property Name */
            property_name: string;
        };
        /** MaintenanceOut */
        MaintenanceOut: {
            /** Id */
            id: string;
            /** Property Id */
            property_id: string;
            /** Tenancy Id */
            tenancy_id: string | null;
            /** Tenant Name */
            tenant_name: string | null;
            /** Unit */
            unit: string | null;
            /** Property Name */
            property_name: string;
            /** Provider Id */
            provider_id: string | null;
            /** Title */
            title: string;
            /** Description */
            description: string;
            /** Category */
            category: string;
            /** Priority */
            priority: string;
            /** Status */
            status: string;
            /** Assigned To */
            assigned_to: string;
            /** Cost */
            cost: number | null;
            /** Updates */
            updates: components["schemas"]["UpdateOut"][];
            /** Created At */
            created_at: string;
        };
        /** MaintenanceUpdate */
        MaintenanceUpdate: {
            /**
             * Status
             * @enum {string}
             */
            status: "submitted" | "acknowledged" | "assigned" | "in_progress" | "awaiting_parts" | "resolved" | "closed";
            /** Note */
            note: string;
            /**
             * Assigned To
             * @default
             */
            assigned_to: string;
            /** Provider Id */
            provider_id?: string | null;
            /**
             * Cost
             * @default 0
             */
            cost: number;
        };
        /** OrganizationOut */
        OrganizationOut: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /**
             * Role
             * @enum {string}
             */
            role: "owner" | "manager" | "agent" | "caretaker" | "maintenance" | "finance" | "tenant";
            /** Currency */
            currency: string;
            /** Timezone */
            timezone: string;
            /** Demo */
            demo: boolean;
        };
        /** OutgoingPaymentIn */
        OutgoingPaymentIn: {
            /** Amount */
            amount: number;
            /**
             * Paid On
             * Format: date
             */
            paid_on: string;
            /**
             * Method
             * @enum {string}
             */
            method: "bank" | "mpesa" | "cash" | "cheque";
            /**
             * Reference
             * @default
             */
            reference: string;
            /** Idempotency Key */
            idempotency_key: string;
        };
        /** OutgoingPaymentOut */
        OutgoingPaymentOut: {
            /** Id */
            id: string;
            /** Amount */
            amount: number;
            /**
             * Paid On
             * Format: date
             */
            paid_on: string;
            /** Method */
            method: string;
            /** Reference */
            reference: string;
            /** Reversed At */
            reversed_at: string | null;
            /** Reversal Reason */
            reversal_reason: string | null;
        };
        /** OwnerFinanceOut */
        OwnerFinanceOut: {
            /** Period */
            period: string;
            /** Inflows */
            inflows: number;
            /** Service Paid */
            service_paid: number;
            /** Operating Paid */
            operating_paid: number;
            /** Tax Paid */
            tax_paid: number;
            /** Loan Paid */
            loan_paid: number;
            /** Owner Use Paid */
            owner_use_paid: number;
            /** Net Movement */
            net_movement: number;
            /** Outstanding */
            outstanding: number;
            /** Overdue */
            overdue: number;
        };
        /** PayableIn */
        PayableIn: {
            /**
             * Kind
             * @enum {string}
             */
            kind: "service" | "operating" | "tax" | "loan" | "owner_use";
            /** Property Id */
            property_id?: string | null;
            /** Provider Id */
            provider_id?: string | null;
            /** Maintenance Id */
            maintenance_id?: string | null;
            /** Description */
            description: string;
            /**
             * Reference
             * @default
             */
            reference: string;
            /** Amount */
            amount: number;
            /**
             * Issued On
             * Format: date
             */
            issued_on: string;
            /**
             * Due Date
             * Format: date
             */
            due_date: string;
            /** Idempotency Key */
            idempotency_key: string;
        };
        /** PayableOut */
        PayableOut: {
            /** Id */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "service" | "operating" | "tax" | "loan" | "owner_use";
            /** Property Id */
            property_id: string | null;
            /** Property Name */
            property_name: string | null;
            /** Provider Id */
            provider_id: string | null;
            /** Provider Name */
            provider_name: string | null;
            /** Maintenance Id */
            maintenance_id: string | null;
            /** Description */
            description: string;
            /** Reference */
            reference: string;
            /** Amount */
            amount: number;
            /** Paid */
            paid: number;
            /** Balance */
            balance: number;
            /**
             * Issued On
             * Format: date
             */
            issued_on: string;
            /**
             * Due Date
             * Format: date
             */
            due_date: string;
            /** Last Paid On */
            last_paid_on: string | null;
            /** Overdue */
            overdue: boolean;
            /** Voided At */
            voided_at: string | null;
            /** Void Reason */
            void_reason: string | null;
            /** Payments */
            payments: components["schemas"]["OutgoingPaymentOut"][];
        };
        /** PaymentIn */
        PaymentIn: {
            /** Tenancy Id */
            tenancy_id: string;
            /** Amount */
            amount: number;
            /**
             * Received On
             * Format: date
             */
            received_on: string;
            /**
             * Reference
             * @default
             */
            reference: string;
            /**
             * Method
             * @enum {string}
             */
            method: "bank" | "mpesa" | "cash" | "cheque";
            /**
             * Purpose
             * @default rent
             * @enum {string}
             */
            purpose: "rent" | "deposit";
            /** Idempotency Key */
            idempotency_key: string;
        };
        /** PaymentOut */
        PaymentOut: {
            /** Id */
            id: string;
            /** Tenancy Id */
            tenancy_id: string;
            /** Tenant */
            tenant: string;
            /** Property Name */
            property_name: string;
            /** Unit */
            unit: string;
            /** Amount */
            amount: number;
            /** Currency */
            currency: string;
            /** Reference */
            reference: string;
            /** Method */
            method: string;
            /** Provenance */
            provenance: string;
            /** Purpose */
            purpose: string;
            /**
             * Received On
             * Format: date
             */
            received_on: string;
            /** Reversed At */
            reversed_at: string | null;
            /** Reversal Reason */
            reversal_reason: string | null;
            /** Allocated */
            allocated: number;
            /** Allocations */
            allocations: components["schemas"]["AllocationOut"][];
        };
        /** PropertyIn */
        PropertyIn: {
            /** Name */
            name: string;
            /** Location */
            location: string;
            /**
             * County
             * @default
             */
            county: string;
            /**
             * Contact
             * @default
             */
            contact: string;
            /**
             * Archived
             * @default false
             */
            archived: boolean;
        };
        /** PropertyOut */
        PropertyOut: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Location */
            location: string;
            /** County */
            county: string;
            /** Contact */
            contact: string;
            /** Units */
            units: number;
            /** Occupied */
            occupied: number;
            /** Billed */
            billed: number | null;
            /** Collected */
            collected: number | null;
            /** Outstanding */
            outstanding: number | null;
        };
        /** ProviderIn */
        ProviderIn: {
            /** Name */
            name: string;
            /** Trade */
            trade: string;
            /**
             * Contact Name
             * @default
             */
            contact_name: string;
            /**
             * Phone
             * @default
             */
            phone: string;
            /**
             * Email
             * @default
             */
            email: string;
            /**
             * Address
             * @default
             */
            address: string;
            /**
             * Notes
             * @default
             */
            notes: string;
            /**
             * Active
             * @default true
             */
            active: boolean;
        };
        /** ProviderOut */
        ProviderOut: {
            /** Name */
            name: string;
            /** Trade */
            trade: string;
            /**
             * Contact Name
             * @default
             */
            contact_name: string;
            /**
             * Phone
             * @default
             */
            phone: string;
            /**
             * Email
             * @default
             */
            email: string;
            /**
             * Address
             * @default
             */
            address: string;
            /**
             * Notes
             * @default
             */
            notes: string;
            /**
             * Active
             * @default true
             */
            active: boolean;
            /** Id */
            id: string;
            /** Billed */
            billed: number | null;
            /** Paid */
            paid: number | null;
            /** Balance */
            balance: number | null;
            /** Last Paid On */
            last_paid_on: string | null;
        };
        /** Reason */
        Reason: {
            /** Reason */
            reason: string;
        };
        /** ReconciliationOut */
        ReconciliationOut: {
            /** Id */
            id: string;
            /** Batch Id */
            batch_id: string;
            /** Amount */
            amount: number;
            /**
             * Date
             * Format: date
             */
            date: string;
            /** Description */
            description: string;
            /** Reference */
            reference: string;
            /** Status */
            status: string;
            /** Suggestions */
            suggestions: components["schemas"]["SuggestionOut"][];
            /** Filename */
            filename: string;
        };
        /** Recover */
        Recover: {
            /**
             * Email
             * Format: email
             */
            email: string;
        };
        /** RecurringChargeIn */
        RecurringChargeIn: {
            /** Tenancy Id */
            tenancy_id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "water" | "garbage" | "service";
            /** Description */
            description: string;
            /** Amount */
            amount: number;
            /**
             * Due Day
             * @default 5
             */
            due_day: number;
            /** Start Period */
            start_period: string;
            /** End Period */
            end_period?: string | null;
            /**
             * Active
             * @default true
             */
            active: boolean;
        };
        /** RecurringChargeOut */
        RecurringChargeOut: {
            /** Tenancy Id */
            tenancy_id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "water" | "garbage" | "service";
            /** Description */
            description: string;
            /** Amount */
            amount: number;
            /**
             * Due Day
             * @default 5
             */
            due_day: number;
            /** Start Period */
            start_period: string;
            /** End Period */
            end_period?: string | null;
            /**
             * Active
             * @default true
             */
            active: boolean;
            /** Id */
            id: string;
        };
        /** Redeem */
        Redeem: {
            /** Token */
            token: string;
            /** Name */
            name: string;
            /** Password */
            password: string;
        };
        /** RentalOut */
        RentalOut: {
            /** Id */
            id: string;
            /** Unit Id */
            unit_id: string;
            /** Tenant Id */
            tenant_id: string;
            /** Reference */
            reference: string;
            /** Rent */
            rent: number;
            /** Deposit */
            deposit: number;
            /** Due Day */
            due_day: number;
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /** End Date */
            end_date: string | null;
            /** Status */
            status: string;
            /** Property Id */
            property_id: string;
            /** Property Name */
            property_name: string;
            /** Location */
            location: string;
            /** County */
            county: string;
            /** Contact */
            contact: string;
            /** Number */
            number: string;
            /** Building */
            building: string;
            /** Floor */
            floor: string;
            /** Unit Type */
            unit_type: string;
            /**
             * Usage
             * @enum {string}
             */
            usage: "residential" | "commercial";
            /** Currency */
            currency: string;
            /** Outstanding */
            outstanding: number;
            /** Overdue */
            overdue: number;
        };
        /** SessionOut */
        SessionOut: {
            /** User Id */
            user_id: string;
            /** Name */
            name: string;
            /** Email */
            email: string;
            /** Csrf */
            csrf: string;
            /** Organizations */
            organizations: components["schemas"]["OrganizationOut"][];
            /** Token */
            token?: string | null;
        };
        /** SuggestionOut */
        SuggestionOut: {
            /** Tenancy Id */
            tenancy_id: string;
            /** Reason */
            reason: string;
        };
        /** TenancyIn */
        TenancyIn: {
            /** Unit Id */
            unit_id: string;
            /** Tenant Id */
            tenant_id: string;
            /** Reference */
            reference: string;
            /** Rent */
            rent: number;
            /**
             * Deposit
             * @default 0
             */
            deposit: number;
            /**
             * Due Day
             * @default 5
             */
            due_day: number;
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /** End Date */
            end_date?: string | null;
        };
        /** TenancyOut */
        TenancyOut: {
            /** Id */
            id: string;
            /** Unit Id */
            unit_id: string;
            /** Tenant Id */
            tenant_id: string;
            /** Reference */
            reference: string;
            /** Rent */
            rent: number;
            /** Deposit */
            deposit: number;
            /** Due Day */
            due_day: number;
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /** End Date */
            end_date: string | null;
            /** Status */
            status: string;
        };
        /** TenantIn */
        TenantIn: {
            /** Name */
            name: string;
            /**
             * Email
             * @default
             */
            email: string;
            /**
             * Phone
             * @default
             */
            phone: string;
            /**
             * Emergency Contact
             * @default
             */
            emergency_contact: string;
        };
        /** TenantOut */
        TenantOut: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Email */
            email: string;
            /** Phone */
            phone: string;
            /** Emergency Contact */
            emergency_contact: string;
            /** Linked */
            linked: boolean;
        };
        /** UnitIn */
        UnitIn: {
            /** Property Id */
            property_id: string;
            /** Number */
            number: string;
            /**
             * Building
             * @default Main
             */
            building: string;
            /**
             * Floor
             * @default
             */
            floor: string;
            /**
             * Unit Type
             * @default Residential
             */
            unit_type: string;
            /**
             * Usage
             * @default residential
             * @enum {string}
             */
            usage: "residential" | "commercial";
            /** Default Rent */
            default_rent: number;
        };
        /** UnitOut */
        UnitOut: {
            /** Id */
            id: string;
            /** Property Id */
            property_id: string;
            /** Number */
            number: string;
            /** Building */
            building: string;
            /** Floor */
            floor: string;
            /** Unit Type */
            unit_type: string;
            /**
             * Usage
             * @enum {string}
             */
            usage: "residential" | "commercial";
            /** Default Rent */
            default_rent: number;
            /** Occupied */
            occupied: boolean;
        };
        /** UpdateOut */
        UpdateOut: {
            /** At */
            at: string;
            /** Actor */
            actor: string;
            /** Status */
            status: string;
            /** Note */
            note: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    ready_ready_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    login_api_v1_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Login"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    mobile_login_api_v1_auth_mobile_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Login"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    session_api_v1_auth_session_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
        };
    };
    logout_api_v1_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    recover_api_v1_auth_recover_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Recover"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    redeem_api_v1_auth_redeem_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Redeem"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    accept_invitation_api_v1_auth_accept_invitation_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Reason"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    invite_api_v1_invitations_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Invite"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    members_api_v1_members_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    deactivate_api_v1_members__member_id__deactivate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                member_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    notifications_api_v1_notifications_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    read_notification_api_v1_notifications__notification_id__read_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                notification_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    properties_api_v1_properties_get: {
        parameters: {
            query?: {
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PropertyOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_property_api_v1_properties_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PropertyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_property_api_v1_properties__property_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                property_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PropertyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    units_api_v1_units_get: {
        parameters: {
            query?: {
                property_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnitOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_unit_api_v1_units_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UnitIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_unit_api_v1_units__unit_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                unit_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UnitIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    tenants_api_v1_tenants_get: {
        parameters: {
            query?: {
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TenantOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_tenant_api_v1_tenants_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TenantIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    tenancies_api_v1_tenancies_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TenancyOut"][];
                };
            };
        };
    };
    create_tenancy_api_v1_tenancies_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TenancyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rentals_api_v1_rentals_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RentalOut"][];
                };
            };
        };
    };
    end_tenancy_api_v1_tenancies__tenancy_id__end_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tenancy_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EndTenancy"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    dashboard_api_v1_dashboard_get: {
        parameters: {
            query: {
                period: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    integrations_api_v1_integrations_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    audit_history_api_v1_audit_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    charges_api_v1_charges_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ChargeOut"][];
                };
            };
        };
    };
    create_charge_api_v1_charges_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChargeIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    generate_api_v1_billing_generate_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Bill"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    payments_api_v1_payments_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentOut"][];
                };
            };
        };
    };
    create_payment_api_v1_payments_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PaymentIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reverse_api_v1_payments__payment_id__reverse_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                payment_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Reason"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    imports_api_v1_imports_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    commit_import_api_v1_imports_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_commit_import_api_v1_imports_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_api_v1_imports_preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_preview_api_v1_imports_preview_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    download_import_api_v1_imports__batch_id__download_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                batch_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reconciliation_api_v1_reconciliation_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReconciliationOut"][];
                };
            };
        };
    };
    decide_api_v1_reconciliation__transaction_id__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                transaction_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Decision"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    export_ledger_api_v1_exports_ledger_csv_get: {
        parameters: {
            query?: {
                tenancy_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    maintenance_api_v1_maintenance_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MaintenanceOut"][];
                };
            };
        };
    };
    create_maintenance_api_v1_maintenance_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MaintenanceIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    maintenance_options_api_v1_maintenance_options_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MaintenanceOptionOut"][];
                };
            };
        };
    };
    update_maintenance_api_v1_maintenance__request_id__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                request_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MaintenanceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    attachments_api_v1_attachments_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    upload_attachment_api_v1_attachments_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_attachment_api_v1_attachments_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    download_attachment_api_v1_attachments__attachment_id__download_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                attachment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    providers_api_v1_providers_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderOut"][];
                };
            };
        };
    };
    create_provider_api_v1_providers_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_provider_api_v1_providers__provider_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    payables_api_v1_payables_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayableOut"][];
                };
            };
        };
    };
    create_payable_api_v1_payables_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PayableIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayableOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    pay_payable_api_v1_payables__payable_id__payments_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                payable_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OutgoingPaymentIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayableOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    void_payable_api_v1_payables__payable_id__void_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                payable_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Reason"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reverse_outgoing_api_v1_outgoing_payments__payment_id__reverse_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                payment_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Reason"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    recurring_charges_api_v1_recurring_charges_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecurringChargeOut"][];
                };
            };
        };
    };
    create_recurring_api_v1_recurring_charges_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecurringChargeIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_recurring_api_v1_recurring_charges__rule_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecurringChargeIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    owner_finances_api_v1_owner_finances_get: {
        parameters: {
            query: {
                period: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OwnerFinanceOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
