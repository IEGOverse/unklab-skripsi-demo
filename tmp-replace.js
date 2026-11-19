const fs = require('fs');
const p = './frontend/src/pages/AlurSkripsi.jsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');
// Stage 4 = baris 563..617 (1-indexed)
const start = 562; // index array
const end = 617;   // sampai baris sebelum stage 5 (baris 619), sisakan 1 baris kosong di index 618

const newBlock = `          {activeStage === 4 && (
            <div>
              <StageHeader num={4} title="Seminar Proposal (Sempro)" desc="Alur: (1) Panitia mengatur jadwal — mahasiswa menerima notifikasi. (2) Setelah terlaksana, nilai diinput & diverifikasi ini → Berita Acara. Tidak lulus? Dijadwalkan ulang." />

              {/* LANGKAH 1 — ATUR JADWAL TERLEBIH DAHULU */}
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Langkah 1 — Atur Jadwal Sempro</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Tanggal Sempro" type="date" value={wf.sempro_tanggal || ''} onChange={(e) => setWfDraft({ ...wf, sempro_tanggal: e.target.value })} disabled={!isAdmin} />
                  <Input label="Waktu" type="time" value={wf.sempro_waktu || ''} onChange={(e) => setWfDraft({ ...wf, sempro_waktu: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="mt-3">
                  <Input label="Ruangan" value={wf.sempro_ruangan || ''} onChange={(e) => setWfDraft({ ...wf, sempro_ruangan: e.target.value })} placeholder="Mis. R101" disabled={!isAdmin} />
                </div>
                <div className="mt-3">
                  <PengujiSelector selected={wf.sempro_penguji || []} onToggle={(id) => setWfDraft({ ...wf, sempro_penguji: togglePenguji(wf.sempro_penguji || [], id) })} max="minimal 1" />
                </div>
                {isAdmin && (
                  <Button className="mt-3 w-full" disabled={saving || !wf.sempro_tanggal || !wf.sempro_waktu || !(wf.sempro_ruangan || '').trim() || !(wf.sempro_penguji?.length >= 1)} onClick={handleScheduleSempro}>
                    <CalendarDays className="w-4 h-4 mr-2" /> {wf.sempro_scheduled ? 'Perbarui Jadwal & Kirim Notifikasi' : 'Terbitkan Jadwal & Kirim Notifikasi'}
                  </Button>
                )}
                {wf.sempro_scheduled && (
                  <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                    <p className="font-bold">Jadwal diterbitkan — mahasiswa menerima notifikasi.</p>
                    <p className="mt-0.5">{fmtDateID(wf.sempro_tanggal)} · {wf.sempro_waktu} · {wf.sempro_ruangan} · Penguji: {(wf.sempro_penguji || []).map(lecturerName).join(', ')}</p>
                  </div>
                )}
              </div>

              {/* LANGKAH 2 — NILAI & BERITA ACARA (terkunci sampai jadwal terbit) */}
              <div className={'mt-4 p-4 rounded-xl border ' + (wf.sempro_scheduled ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50')}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Langkah 2 — Nilai & Berita Acara</p>
                {!wf.sempro_scheduled && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Nilai hanya bisa diinput setelah jadwal diterbitkan (Langkah 1).</p>
                )}
                {wf.sempro_scheduled && (
                  <>
                    {wf.sempro_penguji?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Nilai per Penguji (0–100)</p>
                        <div className="space-y-2">
                          {wf.sempro_penguji.map((pid) => {
                            const editable = isAdmin || (isDosen && meAsLecturer?.id === pid);
                            return (
                              <div key={pid} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white">
                                <span className="flex-1 text-sm text-slate-800">{lecturerName(pid)}</span>
                                <input type="number" min={0} max={100} className={nilaiInputClass} disabled={!editable} value={wf.sempro_detail?.[pid] ?? ''} onChange={(e) => setWfDraft({ ...wf, sempro_detail: { ...wf.sempro_detail, [pid]: e.target.value === '' ? undefined : Number(e.target.value) } })} placeholder="0-100" />
                              </div>
                            );
                          })}
                        </div>
                        {semproNilai != null && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-900 text-cyan-300 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-slate-400">Nilai Sempro (rata-rata)</span>
                            <span className="text-2xl font-extrabold font-display">{semproNilai}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3">
                      <Input label="Catatan Sempro / Revisi" value={wf.sempro_catatan || ''} onChange={(e) => setWfDraft({ ...wf, sempro_catatan: e.target.value })} disabled={!isAdmin} />
                    </div>
                    {isAdmin && (
                      <>
                        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 mt-3">
                          <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!wf.revisi_sempro_verified} onChange={(e) => setWfDraft({ ...wf, revisi_sempro_verified: e.target.checked })} />
                          Revisi pascasempro sudah diverifikasi (Berita Acara terbit)
                        </label>
                        <Button onClick={saveSempro} disabled={saving || semproNilai == null} className="w-full"><FlaskConical className="w-4 h-4 mr-2" /> Verifikasi Sempro & Terbitkan Berita Acara</Button>
                      </>
                    )}
                  </>
                )}
              </div>
              {wf.sempro_nilai != null && wf.revisi_sempro_verified && wf.sempro_nilai >= 60 && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Sempro LULUS ({wf.sempro_nilai}) — lanjut penelitian</p>}
              {wf.sempro_nilai != null && wf.sempro_nilai < 60 && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Mahasiswa MENGULANG Sempro ({wf.sempro_nilai})</p>
                  {isAdmin && <Button variant="secondary" className="mt-2" onClick={handleRescheduleSempro}>Jadwalkan Ulang Sempro</Button>}
                </div>
              )}
              {wf.sempro_nilai != null && (
                <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 bg-white"><Printer className="w-4 h-4" /> Cetak Berita Acara Sempro</button>
              )}
            </div>
          )}
`;
lines.splice(start, end - start, newBlock);
fs.writeFileSync(p, lines.join('\n'));
console.log('replaced. new line count:', lines.length);
console.log('verify markers:', lines.join('\n').includes('handleScheduleSempro'), lines.join('\n').includes('handleRescheduleSempro'), lines.join('\n').includes('fmtDateID'));
