const { db } = require('../services/dbStore');

/**
 * POST /api/schedules/proposal-decision
 * Dosen memutuskan usulan jadwal dari admin (yang muncul karena slot semula bentrok).
 * Body: { decision: 'approve' | 'reject', request_id: number, alasan?: string }
 */
function decideOnProposal(req, res) {
  try {
    const { decision, request_id, alasan } = req.body;
    const role = req.user?.role;

    if (role !== 'dosen' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya dosen atau admin yang dapat memutus usulan ini.' });
    }

    if (!request_id || !decision) {
      return res.status(400).json({ success: false, message: 'request_id dan decision wajib diisi.' });
    }

    const request = (db.get('defense_requests').value() || []).find(r => Number(r.id) === Number(request_id));
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pengajuan defense tidak ditemukan.' });
    }
    if (request.status !== 'menunggu_persetujuan_dosen') {
      return res.status(409).json({ success: false, message: 'Pengajuan ini tidak sedang menunggu persetujuan Anda.' });
    }

    if (decision === 'reject') {
      if (!alasan || !alasan.trim()) {
        return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi.' });
      }
      // Kembalikan ke diterima_dosen (admin dapat mengusulkan ulang)
      db.get('defense_requests')
        .find({ id: Number(request_id) })
        .assign({ status: 'diterima_dosen', alasan_dosen: alasan.trim() })
        .write();

      // Notifikasi ke admin
      const student = (db.get('students').value() || []).find(s => Number(s.id) === Number(request.student_id));
      const studentLabel = student ? student.nama : `Mahasiswa #${request.student_id}`;
      const maxNotifId = (db.get('notifications').value() || []).reduce((m, n) => Math.max(m, n.id || 0), 0);
      db.get('notifications').push({
        id: maxNotifId + 1,
        recipient_role: 'admin',
        sender: 'Dosen',
        title: `Usulan jadwal ditolak — ${studentLabel}`,
        body: `Dosen menolak usulan ${request.usulan_tanggal} ${request.usulan_waktu} di Ruangan ${request.usulan_ruangan}. Alasan: ${alasan.trim()}`,
        type: 'defense_schedule_rejected',
        request_id: Number(request_id),
        read: false,
        created_at: new Date().toISOString(),
      }).write();

      return res.json({ success: true, message: 'Usulan ditolak. Admin akan mengusulkan jadwal baru.' });
    }

    if (decision !== 'approve') {
      return res.status(400).json({ success: false, message: 'decision harus approve atau reject.' });
    }

    // Cek bentrok pada usulan (double-check di server)
    const existing = db.get('defense_schedules').value() || [];
    const conflict = existing.find(s =>
      s.tanggal === request.usulan_tanggal &&
      s.waktu === request.usulan_waktu &&
      (s.dosen_penguji_1_id == request.usulan_penguji_1_id ||
        s.dosen_penguji_2_id == request.usulan_penguji_2_id ||
        s.ruangan == request.usulan_ruangan)
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Usulan bentrok dengan jadwal yang sudah ada. Hubungi admin untuk jadwal lain.',
      });
    }

    // Buat jadwal defense
    const maxId = existing.reduce((m, s) => Math.max(m, s.id || 0), 0);
    const newSchedule = {
      id: maxId + 1,
      defense_request_id: Number(request_id),
      tanggal: request.usulan_tanggal,
      waktu: request.usulan_waktu,
      ruangan: request.usulan_ruangan,
      dosen_penguji_1_id: Number(request.usulan_penguji_1_id),
      dosen_penguji_2_id: Number(request.usulan_penguji_2_id),
      status: 'terjadwal',
      created_at: new Date().toISOString(),
    };
    db.get('defense_schedules').push(newSchedule).write();

    // Tandai pengajuan disetujui & kosongkan alasan dosen
    db.get('defense_requests')
      .find({ id: Number(request_id) })
      .assign({ status: 'disetujui', alasan_dosen: null })
      .write();

    // Tandai notifikasi terkait sudah dibaca
    (db.get('notifications').value() || [])
      .filter(n => n.type === 'defense_schedule_approval' && Number(n.request_id) === Number(request_id))
      .forEach(n => {
        db.get('notifications').find({ id: n.id }).assign({ read: true }).write();
      });

    // Notifikasi ke admin
    const student = (db.get('students').value() || []).find(s => Number(s.id) === Number(request.student_id));
    const studentLabel = student ? student.nama : `Mahasiswa #${request.student_id}`;
    const maxNotifId = db.get('notifications').value().reduce((m, n) => Math.max(m, n.id || 0), 0);
    db.get('notifications').push({
      id: maxNotifId + 1,
      recipient_role: 'admin',
      sender: 'Dosen',
      title: `Jadwal defense disetujui — ${studentLabel}`,
      body: `Dosen menyetujui usulan ${request.usulan_tanggal} ${request.usulan_waktu} di Ruangan ${request.usulan_ruangan}. Jadwal tersimpan.`,
      type: 'defense_schedule_approved',
      request_id: Number(request_id),
      read: false,
      created_at: new Date().toISOString(),
    }).write();

    res.status(201).json({
      success: true,
      data: newSchedule,
      message: 'Usulan jadwal disetujui dan jadwal tersimpan.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal memutus usulan jadwal',
    });
  }
}

module.exports = { decideOnProposal };
