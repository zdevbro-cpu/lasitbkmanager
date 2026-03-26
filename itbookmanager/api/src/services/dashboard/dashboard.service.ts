import { db } from '../../db';

export async function getDashboardStats() {
  const [members, tablets, content, payments] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE member_status = 'active') AS active_count,
        COUNT(*) FILTER (WHERE member_status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE member_type = 'managed' AND member_status = 'active') AS managed_count,
        COUNT(*) FILTER (WHERE member_type = 'subscription' AND member_status = 'active') AS subscription_count
      FROM members
    `),
    db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'stock') AS stock,
        COUNT(*) FILTER (WHERE status = 'loaned') AS loaned,
        COUNT(*) FILTER (WHERE status = 'repair') AS repair,
        COUNT(*) FILTER (WHERE status = 'lost') AS lost
      FROM tablets
    `),
    db.query(`
      SELECT
        COUNT(*) AS total_packages,
        COUNT(*) FILTER (WHERE is_published = true) AS published_packages,
        (SELECT COUNT(*) FROM content_items WHERE is_active = true) AS total_items
      FROM content_packages
    `),
    db.query(`
      SELECT
        COALESCE(SUM(amount_paid) FILTER (WHERE status = 'paid'), 0) AS total_revenue,
        COALESCE(SUM(refund_amount) FILTER (WHERE status = 'approved'), 0) AS total_refunded,
        COUNT(*) FILTER (WHERE r.status = 'requested') AS pending_refunds
      FROM payments p
      LEFT JOIN refunds r ON r.payment_id = p.id
    `),
  ]);

  return {
    members: members.rows[0],
    tablets: tablets.rows[0],
    content: content.rows[0],
    payments: payments.rows[0],
  };
}

export async function getRecentActivity() {
  const [recentMembers, recentLoans, recentRefunds] = await Promise.all([
    db.query(`
      SELECT id, name, member_number, member_type, member_status, created_at
      FROM members ORDER BY created_at DESC LIMIT 5
    `),
    db.query(`
      SELECT tl.*, t.qr_code, m.name AS member_name
      FROM tablet_loans tl
      JOIN tablets t ON t.id = tl.tablet_id
      JOIN members m ON m.id = tl.member_id
      ORDER BY tl.created_at DESC LIMIT 5
    `),
    db.query(`
      SELECT r.*, m.name AS member_name
      FROM refunds r
      JOIN members m ON m.id = r.member_id
      WHERE r.status = 'requested'
      ORDER BY r.requested_at ASC LIMIT 5
    `),
  ]);

  return {
    recentMembers: recentMembers.rows,
    recentLoans: recentLoans.rows,
    pendingRefunds: recentRefunds.rows,
  };
}
