import { describe, it, expect } from 'vitest'
import { generateMR, existingPatients, centerOptions, searchFields, centersByPrefix, bloodGroups, genders } from '@/lib/registration-data'

describe('registration-data', () => {
  it('has nutrition and ayurcare centers', () => {
    expect(centerOptions).toHaveLength(2)
    expect(centerOptions.map((c) => c.id)).toEqual(['nutrition', 'ayurcare'])
  })

  it('generates NU MR for nutrition center', () => {
    const mr = generateMR('nutrition', existingPatients)
    expect(mr).toMatch(/^NU\d{6}$/)
    expect(mr).toBe('NU000003')
  })

  it('generates AY MR for ayurcare center', () => {
    const mr = generateMR('ayurcare', existingPatients)
    expect(mr).toMatch(/^AY\d{6}$/)
    expect(mr).toBe('AY000002')
  })

  it('generates next sequential MR when adding a new patient', () => {
    const patients = [
      ...existingPatients,
      { mr: 'NU000005', name: 'Test', parentName: 'Test', mobile: '1234567890', age: 0, gender: 'Male', bloodGroup: '', city: '', lastVisit: '', tags: [], visits: [], bills: [] },
    ]
    expect(generateMR('nutrition', patients)).toBe('NU000006')
    expect(generateMR('ayurcare', patients)).toBe('AY000002')
  })

  it('centersByPrefix maps NU and AY correctly', () => {
    expect(centersByPrefix['NU']).toBe('Nutrition Center')
    expect(centersByPrefix['AY']).toBe('Ayurcare Center')
  })

  it('searchFields includes MR, mobile, name, parent', () => {
    expect(searchFields.map((f) => f.id)).toEqual(['mr', 'mobile', 'name', 'parent'])
    expect(searchFields[0].placeholder).toContain('NU000001')
  })

  it('all existing patients have valid NU or AY format MR', () => {
    existingPatients.forEach((p) => {
      expect(p.mr).toMatch(/^(NU|AY)\d{6}$/)
    })
  })

  it('has required blood groups', () => {
    expect(bloodGroups).toContain('A+')
    expect(bloodGroups).toContain('O-')
    expect(bloodGroups).toContain('AB+')
  })

  it('has required gender options', () => {
    expect(genders).toEqual(['Male', 'Female', 'Other'])
  })
})
