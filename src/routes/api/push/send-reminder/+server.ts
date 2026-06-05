import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { _getSubscriptions } from '../subscribe/+server';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ request, platform, url }) => {
	try {
		// Verify authorization token to prevent unauthorized triggers
		const authHeader = request.headers.get('Authorization');
		const isSameOrigin = 
			request.headers.get('origin') === url.origin || 
			request.headers.get('referer')?.startsWith(url.origin);

		if (!isSameOrigin && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Read customizable message from request if any
		const bodyData = await request.json().catch(() => ({}));
		const title = bodyData.title || 'Money Notes';
		const messageText = bodyData.body || 'Jangan lupa untuk mencatat transaksi keuanganmu hari ini! 💵';

		// Get all subscriptions
		const subscriptions = await _getSubscriptions(platform);

		if (subscriptions.length === 0) {
			return json({ success: true, message: 'No subscriptions found to notify' });
		}

		const vapidKeys = {
			subject: VAPID_SUBJECT,
			publicKey: VAPID_PUBLIC_KEY,
			privateKey: VAPID_PRIVATE_KEY
		};

		const payloadStr = JSON.stringify({
			title,
			body: messageText
		});

		const results = await Promise.allSettled(
			subscriptions.map(async (sub) => {
				// Encrypt the payload and sign with VAPID
				const pushRequest = await buildPushPayload(
					{
						data: payloadStr
					},
					{
						endpoint: sub.endpoint,
						expirationTime: null,
						keys: {
							p256dh: sub.keys.p256dh,
							auth: sub.keys.auth
						}
					},
					vapidKeys
				);

				// Send the push notification request to Google/Mozilla/Apple push servers
				const res = await fetch(sub.endpoint, {
					method: 'POST',
					headers: pushRequest.headers as HeadersInit,
					body: pushRequest.body as any
				});

				if (!res.ok) {
					throw new Error(`Failed to send push: Status ${res.status}`);
				}
				return sub.endpoint;
			})
		);

		const successCount = results.filter((r) => r.status === 'fulfilled').length;
		const failCount = results.filter((r) => r.status === 'rejected').length;

		console.log(`Push notifications sent. Success: ${successCount}, Failed: ${failCount}`);

		return json({
			success: true,
			sent: successCount,
			failed: failCount,
			total: subscriptions.length
		});
	} catch (err: any) {
		console.error('Send reminder error:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async () => {
	return json(
		{
			error: 'Method GET Not Allowed',
			message: 'Untuk memicu push notification, Anda harus mengirimkan request POST (bukan membuka langsung di browser yang menggunakan GET). Pastikan metode di cron-job.org diatur ke POST.'
		},
		{ status: 405 }
	);
};
