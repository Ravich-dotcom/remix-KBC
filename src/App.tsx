import React, { useState, useEffect, useRef } from 'react';
import { Bot, Settings2, FileText, FileSearch, Sparkles, AlertCircle, Download, CheckCircle2, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { generateDoc, DocxConfig } from './docxGenerator';
import { motion, AnimatePresence } from 'motion/react';

// Help functions for API Key Management
const STORAGE_KEY = 'gemini_api_key_override';
const getStoredApiKey = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
};

const saveApiKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY, key);
};

// Available Models from Gemini skill
const DEFAULT_MODEL = 'gemini-3-flash-preview';

const MADRASAH_SUBJECTS_GROUPED = {
  "Mata Pelajaran Umum Dasar": [
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika",
    "Ilmu Pengetahuan Alam (IPA)",
    "Ilmu Pengetahuan Sosial (IPS)",
    "Bahasa Inggris",
    "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    "Seni Budaya",
    "Sejarah"
  ],
  "PAI & Bahasa Arab (Madrasah)": [
    "Al-Qur'an Hadis",
    "Akidah Akhlak",
    "Fikih",
    "Sejarah Kebudayaan Islam (SKI)",
    "Bahasa Arab"
  ],
  "MIPA & Teknologi (Pilihan SMA/MA)": [
    "Biologi",
    "Fisika",
    "Kimia",
    "Informatika",
    "Matematika Tingkat Lanjut"
  ],
  "IPS (Pilihan SMA/MA)": [
    "Sosiologi",
    "Ekonomi",
    "Geografi",
    "Antropologi"
  ],
  "Bahasa & Budaya (Pilihan SMA/MA)": [
    "Bahasa Indonesia Tingkat Lanjut",
    "Bahasa Inggris Tingkat Lanjut",
    "Bahasa Asing Lainnya"
  ],
  "Ilmu Keagamaan Islam (Pilihan MA)": [
    "Ilmu Tafsir",
    "Ilmu Hadis",
    "Ushul Fikih",
    "Ilmu Kalam",
    "Akhlak Tasawuf",
    "Bahasa Arab Tingkat Lanjut"
  ],
  "Keterampilan & Vokasi": [
    "Prakarya dan Kewirausahaan (PKWU)",
    "Prakarya",
    "Muatan Lokal"
  ]
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const INITIAL_FORM_DATA: DocxConfig = {
  tingkatan: 'SD/MI',
  kelas: '1',
  mapel: MADRASAH_SUBJECTS_GROUPED["Mata Pelajaran Umum Dasar"][0],
  semester: 'Ganjil',
  dokumen: ['CP', 'ATP'] as string[],
  namaMadrasah: '',
  tempatTandaTangan: '',
  tanggalTandaTangan: '',
  namaGuru: '',
  nipGuru: '',
  namaKepala: '',
  nipKepala: '',
  alokasiWaktuPerPekan: '2',
};

export default function App() {
  const [formData, setFormData] = useState<DocxConfig>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errorTimer, setErrorTimer] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(getStoredApiKey());
  const [tempApiKey, setTempApiKey] = useState(getStoredApiKey());

  // Timer Logic for Error Handling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (errorTimer > 0) {
      interval = setInterval(() => setErrorTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval!);
  }, [errorTimer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (type: string) => {
    setFormData(prev => {
      const docs = prev.dokumen.includes(type)
        ? prev.dokumen.filter(d => d !== type)
        : [...prev.dokumen, type];
      return { ...prev, dokumen: docs };
    });
  };

  const getAvailableClasses = (tingkatan: string) => {
    switch (tingkatan) {
      case 'SD/MI': return ['1', '2', '3', '4', '5', '6'];
      case 'SMP/MTs': return ['7', '8', '9'];
      case 'SMA/MA': return ['10', '11', '12'];
      default: return ['1'];
    }
  };

  const handleSaveSettings = () => {
    saveApiKey(tempApiKey);
    setUserApiKey(tempApiKey);
    setShowSettings(false);
  };

  const generateAIRequest = async () => {
    if (formData.dokumen.length === 0) {
      alert("Pilih minimal 1 jenis dokumen!");
      return;
    }
    if (!formData.mapel) {
      alert("Masukkan Mata Pelajaran!");
      return;
    }

    const apiKeyToUse = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKeyToUse) {
      setShowSettings(true);
      alert("Silakan masukkan Gemini API Key di menu Settings terlebih dahulu.");
      return;
    }

    setLoading(true);
    setShowResult(false);
    
    // Initialize AI within the request to use the latest key
    const ai = new GoogleGenAI({ apiKey: apiKeyToUse });

    const prompt = `Anda adalah seorang ahli pembuat perangkat ajar (Kurikulum) tingkat sekolah dan madrasah (KMA 1503 Tahun 2025 & CP 046 Tahun 2025).
Tugas Anda adalah membuat data perangkat pembelajaran untuk:
- Tingkatan: ${formData.tingkatan} Kelas ${formData.kelas}
- Mata Pelajaran: ${formData.mapel}
- Semester: ${formData.semester}
- Dokumen yang diminta: ${formData.dokumen.join(', ')}
- Alokasi Waktu per Pekan: ${formData.alokasiWaktuPerPekan} JP

Prinsip Kerja:
1. Kepatuhan Regulasi: Selaras dengan CP 046/H/KR/2025 dan KMA 1503 Tahun 2025 (6 hari kerja).
2. Transisi P5RA: Ganti P5RA menjadi Kegiatan Kokurikuler Panca Cita. Kembangkan aktivitas inspiratif.
3. Fleksibilitas Informatif: Penjelasan detail, beri saran aktivitas pembelajaran untuk TP/ATP.
4. Jangan halusinasi, jujur jika tidak ada data spesifik dari CP.
5. Hitungan alokasi waktu harus KONSISTEN di modul ATP, Prota, dan Prosem. Minimal 3 baris materi.

Keluarkan dalam format JSON yang valid. Jangan tambahkan markdown \`\`\`json. Valid JSON Object.
Struktur Wajib:
{
  "cp": [{"elemen": "String (E.g. Menyimak)", "deskripsi": "String deskripsi elemen CP"}],
  "atp": [{"materi": "String", "subMateri": "String", "tpUmum": "String", "tpKhusus": "String", "alokasiWaktu": "String (misal 5 JP)", "dimensiPancasila": "String", "pancaCita": "String", "asesmen": "String", "sumberBelajar": "String"}],
  "prota": [{"semester": "String", "noAtp": "String", "atp": "String", "alokasiWaktu": "String", "keterangan": "String"}],
  "prosem": [{"no": "String", "noAtp": "String", "atp": "String", "alokasiWaktu": "String", "bulan1": [true,false,false,false,false], "bulan2": [false,false,false,false,false], "bulan3": [false,false,false,false,false], "bulan4": [false,false,false,false,false], "bulan5": [false,false,false,false,false], "bulan6": [false,false,false,false,false]}],
  "kktp": [{"tp": "String Tujuan Pembelajaran", "kriteria": "String Kriteria", "baruBerkembang": false, "layak": true, "cakap": false, "mahir": false}]
}
Catatan prosem: Berikan array 5 boolean yang merepresentasikan 5 minggu untuk masing-masing 6 bulan (bulan1 sampai bulan6). Nilai \`true\` menandakan diajarkan di minggu tersebut. Pastikan total true (jumlah minggu mengajar) dikalikan dengan alokasi waktu per pekan (${formData.alokasiWaktuPerPekan} JP) sesuai dengan total JP semester tersebut.
HANYA kembalikan JSON.
`;

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const json = JSON.parse(text);
      setAiResult(json);
      setShowResult(true);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('API_KEY_INVALID')) {
        alert("API Key tidak valid atau telah kadaluarsa. Periksa kembali di menu Settings.");
        setShowSettings(true);
      } else {
        setErrorTimer(60);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadDocx = async () => {
    try {
        await generateDoc(formData, aiResult);
    } catch (e) {
        console.error(e);
        alert("Gagal men-generate dokumen word.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-gray-100 text-gray-800 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0EA5E9] rounded-lg flex items-center justify-center text-white font-bold text-xl">
            G
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-gray-800 leading-tight">AdminGuru AI</h1>
            <p className="text-[12px] text-gray-600">Sistem Administrasi Kurikulum Madrasah & Sekolah</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#E0F2FE] text-[#0369A1] px-2 py-0.5 rounded text-[10px] font-bold hidden sm:block uppercase tracking-wider">
            KMA 1503/2025 & CP 046/2025 COMPLIANT
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full border border-gray-100 hover:border-gray-200"
            title="Pengaturan API Key"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                  <Settings2 size={20} className="text-[#0EA5E9]" />
                  Pengaturan
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Masukkan API Key Anda..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none transition-all font-mono text-sm"
                  />
                  <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                    Kunci API ini digunakan untuk memproses permintaan AI. Data disimpan aman di browser Anda (localStorage) dan tidak akan dikirim ke server kami.
                  </p>
                  <div className="flex flex-col gap-2 mt-4">
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-[#0EA5E9] hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Dapatkan API Key Gratis di Google AI Studio <Sparkles size={12} />
                    </a>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="flex-[2] px-4 py-3 text-sm font-semibold text-white bg-[#0EA5E9] rounded-xl hover:bg-[#0284C7] shadow-lg shadow-sky-100 transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
        {/* Step 1: Input Panel */}
        <aside className="bg-white border-r border-gray-200 p-5 flex flex-col gap-5 overflow-y-auto">
           <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-bold text-[#0369A1] border-b-2 border-sky-500 pb-1 mb-2 uppercase">KONFIGURASI DASAR</p>
              <div className="grid grid-cols-2 gap-3 mb-1.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Tingkatan</label>
                  <select name="tingkatan" value={formData.tingkatan} onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors">
                    <option value="SD/MI">SD/MI</option>
                    <option value="SMP/MTs">SMP/MTs</option>
                    <option value="SMA/MA">SMA/MA</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Kelas</label>
                  <select name="kelas" value={formData.kelas} onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors">
                    {getAvailableClasses(formData.tingkatan).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[2fr_1fr] gap-3 mb-1.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Mata Pelajaran</label>
                  <select name="mapel" value={formData.mapel} onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors">
                    {Object.entries(MADRASAH_SUBJECTS_GROUPED).map(([group, subjects]) => (
                      <optgroup key={group} label={group}>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors">
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Alokasi Waktu (JP per Pekan)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    name="alokasiWaktuPerPekan" 
                    min="1" 
                    max="10" 
                    step="1" 
                    value={formData.alokasiWaktuPerPekan} 
                    onChange={handleInputChange} 
                    className="flex-1 accent-[#0EA5E9]" 
                  />
                  <span className="bg-sky-100 text-[#0369A1] px-3 py-1 rounded-md font-bold text-[13px] min-w-[50px] text-center">
                    {formData.alokasiWaktuPerPekan} JP
                  </span>
                </div>
              </div>
           </div>

           <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-bold text-[#0369A1] border-b-2 border-sky-500 pb-1 mb-2 uppercase">OUTPUT UTAMA</p>
              <div className="grid grid-cols-2 gap-2">
                  {['CP', 'ATP', 'Prota', 'Prosem', 'KKTP'].map(item => (
                    <label key={item} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:border-sky-300 cursor-pointer transition-colors bg-gray-100/50">
                      <input type="checkbox" className="rounded text-sky-500 focus:ring-[#0EA5E9] w-3.5 h-3.5" checked={formData.dokumen.includes(item)} onChange={() => handleCheckboxChange(item)} />
                      <span className="text-[12px] font-medium text-gray-700">{item}</span>
                    </label>
                  ))}
               </div>
           </div>

           <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-bold text-[#0369A1] border-b-2 border-sky-500 pb-1 mb-2 uppercase">IDENTITAS PENANDATANGAN</p>
              <div className="flex flex-col gap-1.5 mb-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Nama Sekolah / Madrasah</label>
                <input type="text" name="namaMadrasah" value={formData.namaMadrasah} placeholder="MIN 1 Kota Inspirasi" onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-1.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Kota Tempat TTD</label>
                  <input type="text" name="tempatTandaTangan" value={formData.tempatTandaTangan} placeholder="Kota/Kab" onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Tanggal TTD</label>
                  <input type="date" name="tanggalTandaTangan" value={formData.tanggalTandaTangan} onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-1.5">
                <div className="flex flex-col gap-1.5">
                   <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Nama Guru</label>
                   <input type="text" name="namaGuru" value={formData.namaGuru} placeholder="Nama Guru..." onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors mb-1.5" />
                   <input type="text" name="nipGuru" value={formData.nipGuru} placeholder="NIP Guru..." onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                   <label className="text-[11px] font-semibold uppercase text-gray-600 tracking-[0.05em]">Kepala Sekolah</label>
                   <input type="text" name="namaKepala" value={formData.namaKepala} placeholder="Nama Kepala..." onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors mb-1.5" />
                   <input type="text" name="nipKepala" value={formData.nipKepala} placeholder="NIP Kepala..." onChange={handleInputChange} className="p-2.5 border border-gray-200 rounded-md text-[13px] bg-gray-100 focus:outline focus:outline-2 focus:outline-[#0EA5E9] focus:border-transparent w-full transition-colors" />
                </div>
              </div>
           </div>

           {errorTimer > 0 && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[13px] flex items-center justify-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Limit/Error. Coba lagi dalam {errorTimer}s
              </div>
           )}

           <button 
              onClick={generateAIRequest}
              disabled={loading || errorTimer > 0}
              className={`mt-auto w-full p-[14px] rounded-lg font-bold text-[14px] text-white flex items-center justify-center gap-2 border-none transition-colors ${
                  (loading || errorTimer > 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0EA5E9] hover:bg-[#0369A1] cursor-pointer'
              }`}
           >
              {loading ? (
                  <><span className="animate-spin text-xl leading-none">◌</span> MEMPROSES...</>
              ) : (
                  <>MULAI GENERATE DOKUMEN</>
              )}
           </button>
        </aside>

        {/* Step 2 & 3: Hasil/Output Panel */}
        <section className="bg-gray-200 p-[30px] flex justify-center items-start overflow-y-auto">
            <div className="bg-white w-[440px] max-w-full min-h-[622px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] p-10 flex flex-col relative shrink-0">
                {showResult && (
                  <button 
                    onClick={downloadDocx}
                    className="absolute -top-[15px] -right-[15px] bg-[#10B981] text-white py-[10px] px-[20px] rounded-[20px] text-[12px] font-semibold cursor-pointer shadow-[0_4px_10px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-colors flex items-center gap-2 z-10 border-none"
                  >
                    ↓ UNDUH FILE WORD (.DOCX)
                  </button>
                )}
                
                {/* Visual Preview / Skeleton */}
                {!showResult && !loading && (
                   <div className="m-auto text-center flex flex-col items-center justify-center">
                     <FileSearch className="w-16 h-16 text-gray-300 mb-4" />
                     <h2 className="text-gray-500 text-[14px] uppercase font-bold tracking-widest border-b-2 border-gray-300 pb-1 mb-2 inline-block">Belum Ada Dokumen</h2>
                     <p className="text-gray-400 text-[11px] leading-relaxed max-w-[250px]">Lengkapi formulir di samping dan klik "Mulai Generate Dokumen"</p>
                   </div>
                )}

                {loading && (
                   <div className="m-auto text-center flex flex-col items-center justify-center">
                     <Bot className="w-16 h-16 text-[#0EA5E9] animate-pulse mb-4" />
                     <h2 className="text-[#0EA5E9] text-[14px] uppercase font-bold tracking-widest border-b-2 border-sky-400 pb-1 mb-2 inline-block animate-pulse">Memproses...</h2>
                     <p className="text-gray-400 text-[11px] leading-relaxed max-w-[250px]">Jangan tutup halaman ini. AI sedang merancang ATP & Prosem...</p>
                   </div>
                )}

                {showResult && !loading && aiResult && (
                   <div className="flex flex-col h-full opacity-60">
                     <div className="text-center mb-[30px]">
                       <h2 className="text-[12px] uppercase border-b-2 border-black inline-block pb-[2px] font-bold">PREVIEW DOKUMEN MOCK</h2>
                       <p className="text-[9px] mt-[5px]">MENAMPILKAN PREVIEW TERBATAS</p>
                     </div>
                     <table className="w-full border-collapse mb-[20px]">
                       <tbody>
                         <tr>
                           <td className="bg-[#f0f0f0] font-bold text-center border border-[#ddd] p-[6px] text-[10px] w-[30px]">No</td>
                           <td className="bg-[#f0f0f0] font-bold text-center border border-[#ddd] p-[6px] text-[10px]">Alur Tujuan Pembelajaran (ATP)</td>
                           <td className="bg-[#f0f0f0] font-bold text-center border border-[#ddd] p-[6px] text-[10px] w-[40px]">JP</td>
                           <td className="bg-[#f0f0f0] font-bold text-center border border-[#ddd] p-[6px] text-[10px]" colSpan={4}>Juli</td>
                           <td className="bg-[#f0f0f0] font-bold text-center border border-[#ddd] p-[6px] text-[10px]" colSpan={4}>Agustus</td>
                         </tr>
                         <tr><td className="text-center border border-[#ddd] p-[6px] text-[10px]">1.1</td><td className="border border-[#ddd] p-[6px] text-[10px]">Menganalisis elemen Panca Cita dalam kehidupan sehari-hari</td><td className="text-center border border-[#ddd] p-[6px] text-[10px]">4</td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td></tr>
                         <tr><td className="text-center border border-[#ddd] p-[6px] text-[10px]">1.2</td><td className="border border-[#ddd] p-[6px] text-[10px]">Evaluasi Kompetensi Capaian Pembelajaran Fase C Elemen 1</td><td className="text-center border border-[#ddd] p-[6px] text-[10px]">2</td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td></tr>
                         <tr><td className="text-center border border-[#ddd] p-[6px] text-[10px]">2.1</td><td className="border border-[#ddd] p-[6px] text-[10px]">Kokurikuler: Proyek Panca Cita Tema Kebhinekaan</td><td className="text-center border border-[#ddd] p-[6px] text-[10px]">6</td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd] text-center text-[10px]">X</td><td className="border border-[#ddd]"></td><td className="border border-[#ddd]"></td></tr>
                       </tbody>
                     </table>
                     <div className="text-[9px] text-[#666] italic mb-[20px]">*Preview hanya ilustrasi struktur. Dokumen dihasilkan otomatis berdasarkan CP 046/H/KR/2025</div>
                     
                     <div className="mt-auto grid grid-cols-2 gap-[20px]">
                        <div className="text-center text-[10px]">
                          <p>Mengetahui,</p>
                          <p>Kepala Madrasah</p>
                          <div className="h-[40px]"></div>
                          <p className="font-bold">{formData.namaKepala || '.........................'}</p>
                          <p>NIP. {formData.nipKepala || '.........................'}</p>
                        </div>
                        <div className="text-center text-[10px]">
                          <p>{formData.tempatTandaTangan || 'Kota'} , {formatDate(formData.tanggalTandaTangan) || 'Tanggal'}</p>
                          <p>Guru Mata Pelajaran</p>
                          <div className="h-[40px]"></div>
                          <p className="font-bold">{formData.namaGuru || '.........................'}</p>
                          <p>NIP. {formData.nipGuru || '.........................'}</p>
                        </div>
                     </div>
                   </div>
                )}
            </div>
        </section>
      </main>
    </div>
  );
}

