import {Send,Square} from 'lucide-react';
import {bulkTotals,type BulkContentPlan} from './content-bulk-model';

type Props={plan:BulkContentPlan;connected:boolean;fileReady:boolean;inspecting:boolean;busy:boolean;approved:boolean;onApprove:(approved:boolean)=>void;onRun:(retry?:boolean,one?:boolean)=>void;onStop:()=>void};
export default function BulkApproval({plan,connected,fileReady,inspecting,busy,approved,onApprove,onRun,onStop}:Props){
 const totals=bulkTotals(plan),remaining=totals.pending+totals.failed;
 const blocked=busy||!connected||!fileReady||inspecting||totals.working||!remaining;
 const message=busy?'Pengiriman sedang berjalan. Hasil tiap lokasi disimpan; tetap buka halaman ini.'
  :!connected?'Hubungkan akun Google terlebih dahulu.'
  :inspecting?'Memeriksa file. Tunggu sampai file siap.'
  :!fileReady?'File belum tersedia di browser ini. Pilih file asli satu kali di bawah; selanjutnya file akan disimpan untuk rencana ini.'
  :totals.working?'Masih ada lokasi yang sedang diproses. Klik Periksa status bulk sebelum melanjutkan.'
  :!remaining?totals.uncertain?'Tidak ada lokasi yang dapat dikirim ulang. Periksa hasil belum pasti di Google.':'Seluruh lokasi sudah selesai diproses.'
  :!approved?(totals.failed&&!totals.pending?'Google menolak pengiriman sebelumnya. Coba ulang satu lokasi terlebih dahulu atau periksa rincian error di bawah.':totals.done?'Sisa lokasi belum dikirim. Periksa pratinjau, centang persetujuan, lalu klik tombol kirim.':'Pengiriman belum dimulai. Periksa pratinjau, centang persetujuan, lalu klik tombol kirim.')
  :'Persetujuan sudah dicentang. Klik tombol kirim untuk memulai.';
 return <div className="bulk-approval">
  <h3>3. Setujui & kirim</h3><p role="status">{message}</p>
  {(remaining>0||busy)&&<div className="studio-action-footer">
   <label className="approval-check"><input type="checkbox" aria-label="Setujui konten bulk dan semua lokasi tujuan" checked={approved} disabled={blocked} onChange={e=>onApprove(e.target.checked)}/><span>Saya sudah memeriksa konten dan seluruh lokasi dalam rencana ini, memiliki hak penggunaan, serta setuju mengirimnya ke lokasi yang dipilih.</span></label>
   <div className="bulk-actions">{busy?<button className="button" onClick={onStop}><Square size={13}/>Hentikan setelah lokasi ini</button>:<>
    {totals.pending>0&&<button className="button primary" disabled={blocked||!approved} onClick={()=>onRun()}><Send size={14}/>{plan.state==='draft'?'Kirim ke '+totals.pending+' lokasi':'Lanjutkan '+totals.pending+' lokasi tersisa'}</button>}
    {totals.pending>1&&<button className="button" disabled={blocked||!approved} onClick={()=>onRun(false,true)}>Kirim ke 1 lokasi dulu</button>}
    {totals.failed>1&&<button className="button" disabled={blocked||!approved} onClick={()=>onRun(true,true)}>Coba ulang 1 lokasi</button>}
    {totals.failed>0&&<button className="button" disabled={blocked||!approved} onClick={()=>onRun(true)}>Ulangi {totals.failed} yang gagal</button>}
   </>}</div>
  </div>}
 </div>;
}
