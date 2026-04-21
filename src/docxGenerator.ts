import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, PageOrientation, TextRun, BorderStyle, HeadingLevel, VerticalAlign, ISectionOptions, ShadingType } from 'docx';
import { saveAs } from 'file-saver';

// Define a type for Form Data that is used in generating docs
export interface DocxConfig {
  tingkatan: string;
  kelas: string;
  mapel: string;
  semester: string;
  dokumen: string[];
  namaMadrasah: string;
  tempatTandaTangan: string;
  tanggalTandaTangan: string;
  namaGuru: string;
  nipGuru: string;
  namaKepala: string;
  nipKepala: string;
  alokasiWaktuPerPekan?: string;
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

const HeaderRowCell = (text: string) => {
  return new TableCell({
    children: [new Paragraph({ text, alignment: AlignmentType.CENTER, style: "HeaderCell" })],
    shading: { fill: "e2e8f0", type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
  });
};

const StandardCell = (text: string) => {
  return new TableCell({
    children: [new Paragraph({ text })],
    verticalAlign: VerticalAlign.CENTER,
  });
};

const createIdentity = (config: DocxConfig, title: string) => {
  return [
    new Paragraph({ 
      text: title, 
      heading: HeadingLevel.HEADING_1, 
      alignment: AlignmentType.CENTER 
    }),
    new Paragraph({ 
      text: config.namaMadrasah, 
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({ text: "" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph(`Mata Pelajaran : ${config.mapel}`)] }),
          new TableCell({ children: [new Paragraph(`Fase/Kelas : ${config.tingkatan} - ${config.kelas}`)] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph(`Penyusun : ${config.namaGuru}`)] }),
          new TableCell({ children: [new Paragraph(`Semester : ${config.semester}`)] }),
        ]}),
      ]
    }),
    new Paragraph({ text: "" }),
  ];
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '................................';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const createSignatureBlock = (config: DocxConfig) => {
  return [
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ text: "Mengetahui,", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "Kepala Madrasah,", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }), 
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                  children: [new TextRun({ text: `(${config.namaKepala})`, bold: true })],
                  alignment: AlignmentType.CENTER
                }),
                new Paragraph({ text: `NIP. ${config.nipKepala}`, alignment: AlignmentType.CENTER }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({ text: `${config.tempatTandaTangan ? config.tempatTandaTangan + ', ' : ''}${formatDate(config.tanggalTandaTangan)}`, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "Guru Mata Pelajaran,", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }), 
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                  children: [new TextRun({ text: `(${config.namaGuru})`, bold: true })],
                  alignment: AlignmentType.CENTER
                }),
                new Paragraph({ text: `NIP. ${config.nipGuru}`, alignment: AlignmentType.CENTER }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
};

export const generateDoc = async (config: DocxConfig, aiData: any) => {
  const sections: ISectionOptions[] = [];

  // 1. CP
  if (config.dokumen.includes('CP') && aiData.cp) {
    const cpParagraphs = aiData.cp.map((item: any) => [
      new Paragraph({
        children: [new TextRun({ text: `Elemen: ${item.elemen || ''}`, bold: true })],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({ text: item.deskripsi || '' })
    ]).flat();

    sections.push({
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
      },
      children: [
        ...createIdentity(config, "CAPAIAN PEMBELAJARAN (CP)"),
        ...cpParagraphs,
        ...createSignatureBlock(config)
      ]
    });
  }

  // 2. ATP
  if (config.dokumen.includes('ATP') && aiData.atp) {
    const atpHeader = new TableRow({
      tableHeader: true,
      children: [
        HeaderRowCell("Materi"),
        HeaderRowCell("Sub Materi"),
        HeaderRowCell("Tujuan Pembelajaran Umum"),
        HeaderRowCell("Tujuan Pembelajaran Khusus"),
        HeaderRowCell("Alokasi Waktu"),
        HeaderRowCell("Dimensi Profil Pelajar Pancasila"),
        HeaderRowCell("Topik Panca Cita"),
        HeaderRowCell("Asesmen"),
        HeaderRowCell("Sumber Belajar"),
      ]
    });
    
    const atpRows = aiData.atp.map((item: any) => new TableRow({
      children: [
        StandardCell(item.materi || ''),
        StandardCell(item.subMateri || ''),
        StandardCell(item.tpUmum || ''),
        StandardCell(item.tpKhusus || ''),
        StandardCell(item.alokasiWaktu || ''),
        StandardCell(item.dimensiPancasila || ''),
        StandardCell(item.pancaCita || ''),
        StandardCell(item.asesmen || ''),
        StandardCell(item.sumberBelajar || ''),
      ]
    }));

    sections.push({
      properties: {
         page: { 
             margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
             size: { orientation: PageOrientation.LANDSCAPE } 
         }
      },
      children: [
        ...createIdentity(config, "ALUR TUJUAN PEMBELAJARAN (ATP)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [atpHeader, ...atpRows]
        }),
        ...createSignatureBlock(config)
      ]
    });
  }

  // 3. Prota
  if (config.dokumen.includes('Prota') && aiData.prota) {
    const protaHeader = new TableRow({
      tableHeader: true,
      children: [
        HeaderRowCell("Semester"),
        HeaderRowCell("No ATP"),
        HeaderRowCell("Alur Tujuan Pembelajaran"),
        HeaderRowCell("Alokasi Waktu"),
        HeaderRowCell("Keterangan"),
      ]
    });
    
    const protaRows = aiData.prota.map((item: any) => new TableRow({
      children: [
        StandardCell(item.semester || ''),
        StandardCell(item.noAtp || ''),
        StandardCell(item.atp || ''),
        StandardCell(item.alokasiWaktu || ''),
        StandardCell(item.keterangan || ''),
      ]
    }));

    sections.push({
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
      },
      children: [
        ...createIdentity(config, "PROGRAM TAHUNAN (PROTA)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [protaHeader, ...protaRows]
        }),
        ...createSignatureBlock(config)
      ]
    });
  }

  // 4. Prosem
  if (config.dokumen.includes('Prosem') && aiData.prosem) {
      // 5 columns per month
      const months = config.semester === 'Ganjil' ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
      
      const prosemHeaderTop = new TableRow({
          tableHeader: true,
          children: [
              new TableCell({ children: [new Paragraph({ text: "No", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
              new TableCell({ children: [new Paragraph({ text: "No ATP", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
              new TableCell({ children: [new Paragraph({ text: "ATP", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
              new TableCell({ children: [new Paragraph({ text: "Alokasi Waktu", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
              ...months.map(m => new TableCell({ children: [new Paragraph({ text: m, alignment: AlignmentType.CENTER })], columnSpan: 5, shading: { fill: "e2e8f0" } }))
          ]
      });

      const prosemHeaderBottomCells = [];
      for(let i = 0; i < 6; i++) {
          prosemHeaderBottomCells.push(HeaderRowCell("1"), HeaderRowCell("2"), HeaderRowCell("3"), HeaderRowCell("4"), HeaderRowCell("5"));
      }
      const prosemHeaderBottom = new TableRow({ children: prosemHeaderBottomCells, tableHeader: true });

      const prosemRows = aiData.prosem.map((item: any) => {
          const cells = [
              StandardCell(item.no || ''),
              StandardCell(item.noAtp || ''),
              StandardCell(item.atp || ''),
              StandardCell(item.alokasiWaktu || ''),
          ];
          for(let i = 1; i <= 6; i++) {
              const bln = item[`bulan${i}`] || [false,false,false,false,false];
              for(let j = 0; j < 5; j++) {
                  cells.push(new TableCell({ 
                      children: [new Paragraph({ text: bln[j] ? "✓" : "", alignment: AlignmentType.CENTER })],
                      shading: bln[j] ? { fill: "93c5fd", type: ShadingType.CLEAR } : undefined
                  }));
              }
          }
          return new TableRow({ children: cells });
      });

      sections.push({
          properties: {
              page: { 
                  margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
                  size: { orientation: PageOrientation.LANDSCAPE } 
              }
          },
          children: [
            ...createIdentity(config, "PROGRAM SEMESTER (PROSEM)"),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: [prosemHeaderTop, prosemHeaderBottom, ...prosemRows]
            }),
            ...createSignatureBlock(config)
          ]
      });
  }

  // 5. KKTP
  if (config.dokumen.includes('KKTP') && aiData.kktp) {
    const kktpTopHeader = new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph({ text: "Tujuan Pembelajaran (TP)", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
          new TableCell({ children: [new Paragraph({ text: "Kriteria", alignment: AlignmentType.CENTER })], rowSpan: 2, shading: { fill: "e2e8f0" } }),
          new TableCell({ children: [new Paragraph({ text: "Interval Skor Ketercapaian", alignment: AlignmentType.CENTER })], columnSpan: 4, shading: { fill: "e2e8f0" } }),
        ]
    });
    
    const kktpBottomHeader = new TableRow({
        tableHeader: true,
        children: [
            HeaderRowCell("Baru Berkembang"),
            HeaderRowCell("Layak"),
            HeaderRowCell("Cakap"),
            HeaderRowCell("Mahir"),
        ]
    });

    const kktpRows = aiData.kktp.map((item: any) => new TableRow({
      children: [
        StandardCell(item.tp || ''),
        StandardCell(item.kriteria || ''),
        new TableCell({ children: [new Paragraph({ text: item.baruBerkembang ? "✓" : "", alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: item.layak ? "✓" : "", alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: item.cakap ? "✓" : "", alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: item.mahir ? "✓" : "", alignment: AlignmentType.CENTER })] }),
      ]
    }));

    sections.push({
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
      },
      children: [
        ...createIdentity(config, "KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [kktpTopHeader, kktpBottomHeader, ...kktpRows]
        }),
        ...createSignatureBlock(config)
      ]
    });
  }

  const doc = new Document({
      creator: 'AdminGuru AI',
      title: 'Perangkat Pembelajaran',
      description: 'Dokumen Perangkat Ajar yang disusun oleh AI',
      styles: {
          paragraphStyles: [
              {
                  id: "HeaderCell",
                  name: "HeaderCell",
                  basedOn: "Normal",
                  next: "Normal",
                  run: { bold: true },
              }
          ]
      },
      sections: sections
  });

  Packer.toBlob(doc).then(blob => {
      saveAs(blob, `Perangkat_Ajar_${config.mapel.replace(/\s+/g, '_')}.docx`);
  });
};
