import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

interface SubjectDef {
  id: string;
  name: string;
  code: string;
  category: string;
  targetPhases: string;
}

const SUBJECT_MAPPINGS: Record<string, SubjectDef> = {
  "PENDIDIKAN PANCASILA": {
    id: "pendidikan-pancasila",
    name: "Pendidikan Pancasila",
    code: "PP",
    category: "wajib",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "BAHASA INDONESIA": {
    id: "bahasa-indonesia",
    name: "Bahasa Indonesia",
    code: "IND",
    category: "wajib",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "MATEMATIKA": {
    id: "matematika",
    name: "Matematika",
    code: "MAT",
    category: "wajib",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "ILMU PENGETAHUAN ALAM DAN SOSIAL": {
    id: "ipas",
    name: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    code: "IPAS",
    category: "wajib",
    targetPhases: "Fase B, Fase C",
  },
  "PENDIDIKAN JASMANI, OLAHRAGA, DAN KESEHATAN": {
    id: "pjok",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    code: "PJOK",
    category: "wajib",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "BAHASA INGGRIS": {
    id: "bahasa-inggris",
    name: "Bahasa Inggris",
    code: "ING",
    category: "pilihan",
    targetPhases: "Fase B, Fase C",
  },
  "SENI MUSIK": {
    id: "seni-musik",
    name: "Seni Musik",
    code: "SM",
    category: "seni",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "SENI RUPA": {
    id: "seni-rupa",
    name: "Seni Rupa",
    code: "SR",
    category: "seni",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "SENI TARI": {
    id: "seni-tari",
    name: "Seni Tari",
    code: "ST",
    category: "seni",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "SENI TEATER": {
    id: "seni-teater",
    name: "Seni Teater",
    code: "STE",
    category: "seni",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI": {
    id: "pendidikan-agama-islam",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    code: "PAI",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA KRISTEN DAN BUDI PEKERTI": {
    id: "pendidikan-agama-kristen",
    name: "Pendidikan Agama Kristen dan Budi Pekerti",
    code: "PAK",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA KATOLIK DAN BUDI PEKERTI": {
    id: "pendidikan-agama-katolik",
    name: "Pendidikan Agama Katolik dan Budi Pekerti",
    code: "PKAT",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA HINDU DAN BUDI PEKERTI": {
    id: "pendidikan-agama-hindu",
    name: "Pendidikan Agama Hindu dan Budi Pekerti",
    code: "PAH",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA BUDDHA DAN BUDI PEKERTI": {
    id: "pendidikan-agama-buddha",
    name: "Pendidikan Agama Buddha dan Budi Pekerti",
    code: "PAB",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
  "PENDIDIKAN AGAMA KHONGHUCU DAN BUDI PEKERTI": {
    id: "pendidikan-agama-khonghucu",
    name: "Pendidikan Agama Khonghucu dan Budi Pekerti",
    code: "PAKH",
    category: "agama",
    targetPhases: "Fase A, Fase B, Fase C",
  },
};

const GRADE_FILES = [
  { file: 'TP_ATP_SD_Kelas_I.xlsx', grade: 1, phase: 'Fase A', group: 'group-a', phaseLetter: 'A' },
  { file: 'TP_ATP_SD_Kelas_II.xlsx', grade: 2, phase: 'Fase A', group: 'group-a', phaseLetter: 'A' },
  { file: 'TP_ATP_SD_Kelas_III.xlsx', grade: 3, phase: 'Fase B', group: 'group-b', phaseLetter: 'B' },
  { file: 'TP_ATP_SD_Kelas_IV.xlsx', grade: 4, phase: 'Fase B', group: 'group-b', phaseLetter: 'B' },
  { file: 'TP_ATP_SD_Kelas_V.xlsx', grade: 5, phase: 'Fase C', group: 'group-c', phaseLetter: 'C' },
  { file: 'TP_ATP_SD_Kelas_VI.xlsx', grade: 6, phase: 'Fase C', group: 'group-c', phaseLetter: 'C' },
];

export interface ParsedTpRecord {
  tpCode: string;
  subjectId: string;
  subjectName: string;
  phase: string;
  targetGrade: number;
  multigradeGroup: string;
  sequenceOrder: number;
  element: string;
  contentScope: string;
  competency: string;
  description: string;
  achievementIndicators: string;
  assessmentExample: string;
  sequenceNotes: string;
  evidenceProduct: string;
  cpReferenceText: string;
  validationNotes: string;
}

export interface ParsedCpRecord {
  subjectId: string;
  phase: string;
  element: string;
  originalSourceText: string;
  duplicateHash: string;
}

function pad(num: number, size: number = 2): string {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

function run() {
  const dir = path.join(process.cwd(), 'src', 'data', 'curriculum');
  const allTps: ParsedTpRecord[] = [];
  const cpMap = new Map<string, ParsedCpRecord>();

  for (const item of GRADE_FILES) {
    const filePath = path.join(dir, item.file);
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['Daftar TP & ATP'];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const dataRows = rows.slice(1).filter((r) => r && r[1]);

    for (const r of dataRows) {
      const rawMapel = String(r[1]).trim();
      const mapping = SUBJECT_MAPPINGS[rawMapel] || {
        id: rawMapel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: rawMapel,
        code: rawMapel.substring(0, 3).toUpperCase(),
        category: 'muatan-lokal',
        targetPhases: 'Fase A, Fase B, Fase C',
      };

      const noAtp = Number(r[4]) || 1;
      const element = String(r[5] || 'Umum').trim();
      const contentScope = String(r[6] || '').trim();
      const description = String(r[7] || '').trim();
      const indicators = String(r[8] || '').trim();
      const assessment = String(r[9] || '').trim();
      const sequenceNotes = String(r[10] || '').trim();
      const evidence = String(r[11] || '').trim();
      const cpRef = String(r[12] || '').trim();
      const valNotes = String(r[13] || '').trim();

      const tpCode = `TP-${mapping.code}-${item.phaseLetter}.${item.grade}-${pad(noAtp)}`;

      // Competency summary
      const competency = `${element}: ${contentScope}`;

      // CP tracking
      const cpKey = `${mapping.id}|${item.phase}|${element}`;
      if (!cpMap.has(cpKey) && cpRef) {
        const hash = crypto
          .createHash('sha256')
          .update(`${mapping.id}|${item.phase}|${element}|${cpRef}`)
          .digest('hex');
        cpMap.set(cpKey, {
          subjectId: mapping.id,
          phase: item.phase,
          element,
          originalSourceText: cpRef,
          duplicateHash: hash,
        });
      }

      allTps.push({
        tpCode,
        subjectId: mapping.id,
        subjectName: mapping.name,
        phase: item.phase,
        targetGrade: item.grade,
        multigradeGroup: item.group,
        sequenceOrder: noAtp,
        element,
        contentScope,
        competency,
        description,
        achievementIndicators: indicators,
        assessmentExample: assessment,
        sequenceNotes,
        evidenceProduct: evidence,
        cpReferenceText: cpRef,
        validationNotes: valNotes,
      });
    }
  }

  console.log(`Extracted ${allTps.length} TPs and ${cpMap.size} CPs.`);

  // Write TypeScript dataset
  const outputPath = path.join(process.cwd(), 'src', 'data', 'curriculum', 'tp-atp-dataset.ts');
  const fileContent = `/**
 * Official Kurikulum Merdeka TP & ATP Dataset for SDN SEDAENG II TOSARI
 * Auto-generated from BSKAP No. 032/H/KR/2024 (Lampiran II) Excel workbooks:
 * - TP_ATP_SD_Kelas_I.xlsx s/d TP_ATP_SD_Kelas_VI.xlsx
 * Total TP: ${allTps.length} records across 16 subjects and 6 grades.
 */

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  category: string;
  targetPhases: string;
}

export interface CpItem {
  subjectId: string;
  phase: "Fase A" | "Fase B" | "Fase C";
  element: string;
  originalSourceText: string;
  duplicateHash: string;
}

export interface TpItem {
  tpCode: string;
  subjectId: string;
  subjectName: string;
  phase: "Fase A" | "Fase B" | "Fase C";
  targetGrade: number;
  multigradeGroup: "group-a" | "group-b" | "group-c";
  sequenceOrder: number;
  element: string;
  contentScope: string;
  competency: string;
  description: string;
  achievementIndicators: string;
  assessmentExample: string;
  sequenceNotes: string;
  evidenceProduct: string;
  cpReferenceText: string;
  validationNotes: string;
}

export const OFFICIAL_SUBJECTS: SubjectItem[] = ${JSON.stringify(Object.values(SUBJECT_MAPPINGS), null, 2)};

export const OFFICIAL_CPS: CpItem[] = ${JSON.stringify(Array.from(cpMap.values()), null, 2)};

export const OFFICIAL_TPS: TpItem[] = ${JSON.stringify(allTps, null, 2)};
`;

  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`Saved dataset to ${outputPath}`);
}

run();
