import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface TenantInfo {
    /** Organization ID (prefer this); server returns organizationId */
    organizationId: string;
    /** @deprecated Use organizationId. Kept for compatibility. */
    id?: string;
    name: string;
    subdomain: string;
    logoUrl?: string;
    primaryColor?: string;
    userSubscriptionEnabled?: boolean;
    userMonthlyPricePiasters?: number;
    userAnnualPricePiasters?: number;
    userCurrency?: string;
}

const fetchTenantInfo = async (): Promise<TenantInfo | null> => {
    try {
        const response = await axios.get('/api/tenant/info');
        const data = response.data;
        // Server returns organizationId; ensure both id and organizationId are set for compatibility
        return { ...data, organizationId: data.organizationId ?? data.id, id: data.organizationId ?? data.id };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

export function useTenant() {
    return useQuery({
        queryKey: ['tenant-info'],
        queryFn: fetchTenantInfo,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false,
    });
}
