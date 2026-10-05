import { describe, expect, it } from 'vitest';
import {
  buildOptionAxes,
  discountPercent,
  findVariant,
  matchFlatZone,
  normalizeIndonesianPhone,
  normalizeStoreSort,
  type StoreFlatZone,
} from './types';

const zones: StoreFlatZone[] = [
  { code: 'JABAR', name: 'Jawa Barat', provinces: ['Jawa Barat'], price: 15000, etaLabel: null },
  { code: 'JKT', name: 'Jakarta & Banten', provinces: ['DKI Jakarta', 'Banten'], price: 18000, etaLabel: null },
  { code: 'LAINNYA', name: 'Lainnya', provinces: [], price: 65000, etaLabel: null },
];

describe('matchFlatZone', () => {
  it('cocokkan provinsi tanpa peduli huruf besar/kecil', () => {
    expect(matchFlatZone('dki jakarta', zones)?.code).toBe('JKT');
    expect(matchFlatZone('Jawa Barat', zones)?.price).toBe(15000);
  });
  it('provinsi tanpa zona khusus jatuh ke zona sisa', () => {
    expect(matchFlatZone('Papua', zones)?.code).toBe('LAINNYA');
  });
  it('provinsi kosong → null; tanpa zona sisa → null', () => {
    expect(matchFlatZone('  ', zones)).toBeNull();
    expect(matchFlatZone('Papua', zones.slice(0, 2))).toBeNull();
  });
});

describe('normalizeIndonesianPhone', () => {
  it('menormalkan 08…, 8…, +62…', () => {
    expect(normalizeIndonesianPhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizeIndonesianPhone('81234567890')).toBe('6281234567890');
    expect(normalizeIndonesianPhone('+62 812 3456 7890')).toBe('6281234567890');
  });
  it('menolak nomor non-seluler atau terlalu pendek', () => {
    expect(normalizeIndonesianPhone('022-1234567')).toBeNull();
    expect(normalizeIndonesianPhone('0812')).toBeNull();
    expect(normalizeIndonesianPhone('')).toBeNull();
  });
});

describe('discountPercent', () => {
  it('membulatkan persen diskon', () => {
    expect(discountPercent(99000, 129000)).toBe(23);
  });
  it('tanpa harga coret / harga coret tidak lebih tinggi → null', () => {
    expect(discountPercent(99000, null)).toBeNull();
    expect(discountPercent(99000, 99000)).toBeNull();
    expect(discountPercent(99000, 50000)).toBeNull();
  });
});

describe('varian', () => {
  const variants = [
    { id: 'a', options: { Warna: 'Pink', Tipe: 'iPhone 15' } },
    { id: 'b', options: { Warna: 'Pink', Tipe: 'iPhone 16' } },
    { id: 'c', options: { Warna: 'Hitam', Tipe: 'iPhone 15' } },
  ];
  it('sumbu pilihan mempertahankan urutan data', () => {
    expect(buildOptionAxes(variants)).toEqual([
      { name: 'Warna', values: ['Pink', 'Hitam'] },
      { name: 'Tipe', values: ['iPhone 15', 'iPhone 16'] },
    ]);
  });
  it('findVariant butuh pilihan lengkap', () => {
    expect(findVariant(variants, { Warna: 'Hitam', Tipe: 'iPhone 15' })?.id).toBe('c');
    expect(findVariant(variants, { Warna: 'Hitam' })).toBeNull();
  });
});

describe('normalizeStoreSort', () => {
  it('nilai tak dikenal → newest', () => {
    expect(normalizeStoreSort('price_asc')).toBe('price_asc');
    expect(normalizeStoreSort('drop table')).toBe('newest');
  });
});
