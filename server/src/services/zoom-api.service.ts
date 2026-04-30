interface ZoomTokenResponse {
    access_token?: string;
    expires_in?: number;
    error?: string;
    reason?: string;
}

interface ZoomCreateMeetingResponse {
    id?: number | string;
    uuid?: string;
    join_url?: string;
    start_url?: string;
    host_email?: string;
}

export interface CreateZoomMeetingInput {
    title: string;
    startTime: Date;
    endTime: Date;
    timezone?: string;
}

export interface CreatedZoomMeeting {
    meetingId: string;
    meetingUuid: string | null;
    joinUrl: string;
    startUrl: string | null;
    hostEmail: string | null;
}

let cachedToken: { token: string; expiresAtMs: number } | null = null;

function readZoomEnv() {
    const accountId = process.env.ZOOM_ACCOUNT_ID?.trim();
    const clientId = process.env.ZOOM_CLIENT_ID?.trim();
    const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
    const missing = [
        ['ZOOM_ACCOUNT_ID', accountId],
        ['ZOOM_CLIENT_ID', clientId],
        ['ZOOM_CLIENT_SECRET', clientSecret],
    ]
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        throw new Error(`Zoom meeting creation is not configured. Missing: ${missing.join(', ')}.`);
    }

    return { accountId: accountId!, clientId: clientId!, clientSecret: clientSecret! };
}

async function readErrorBody(response: Response): Promise<string> {
    try {
        const body = await response.json() as Record<string, unknown>;
        return String(body.message ?? body.reason ?? body.error ?? response.statusText);
    } catch {
        return response.statusText;
    }
}

async function getZoomAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAtMs > Date.now() + 30_000) {
        return cachedToken.token;
    }

    const { accountId, clientId, clientSecret } = readZoomEnv();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenUrl = new URL('https://zoom.us/oauth/token');
    tokenUrl.searchParams.set('grant_type', 'account_credentials');
    tokenUrl.searchParams.set('account_id', accountId);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    if (!response.ok) {
        const detail = await readErrorBody(response);
        throw new Error(`Zoom OAuth failed (${response.status}): ${detail}`);
    }

    const payload = await response.json() as ZoomTokenResponse;
    if (!payload.access_token) {
        throw new Error(`Zoom OAuth returned no access token: ${payload.error ?? payload.reason ?? 'unknown error'}`);
    }

    const expiresInSeconds = Math.max(60, payload.expires_in ?? 3600);
    cachedToken = {
        token: payload.access_token,
        expiresAtMs: Date.now() + (expiresInSeconds - 60) * 1000,
    };

    return payload.access_token;
}

export async function createZoomMeeting(input: CreateZoomMeetingInput): Promise<CreatedZoomMeeting> {
    if (input.startTime >= input.endTime) {
        throw new Error('Cannot create Zoom meeting: start time must be before end time.');
    }

    const token = await getZoomAccessToken();
    const durationMinutes = Math.max(1, Math.ceil((input.endTime.getTime() - input.startTime.getTime()) / 60_000));

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic: input.title,
            type: 2,
            start_time: input.startTime.toISOString(),
            duration: durationMinutes,
            timezone: input.timezone ?? 'UTC',
            settings: {
                waiting_room: true,
                join_before_host: false,
                approval_type: 0,
                meeting_authentication: false,
                host_video: true,
                participant_video: true,
                mute_upon_entry: true,
            },
        }),
    });

    if (!response.ok) {
        const detail = await readErrorBody(response);
        throw new Error(`Zoom meeting creation failed (${response.status}): ${detail}`);
    }

    const meeting = await response.json() as ZoomCreateMeetingResponse;
    if (!meeting.id || !meeting.join_url) {
        throw new Error('Zoom meeting creation returned an incomplete meeting payload.');
    }

    return {
        meetingId: String(meeting.id),
        meetingUuid: meeting.uuid ?? null,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url ?? null,
        hostEmail: meeting.host_email ?? null,
    };
}
