import { describe, it, expect } from 'vitest'
import { generateMR, existingPatients, centerOptions, searchFields, centersByPrefix, bloodGroups, genders } from '@/lib/registration-data'

describe('registration-data', () => {
  it('has nutrition and ayurcare centers', () => {
    expect(centerOptions).toHaveLength(2)
    expect(centerOptions.map((c) => c.id)).toEqual(['nutrition', 'ayurcare'])
  })

  it('generates next MR number', () => {
    const mr = generateMR(existingPatients)
    expect(mr).toMatch(/^MR\d{6}$/)
    expect(mr).toBe('MR000004')
  })

  it('generates next sequential MR when adding a new patient', () => {
    const patients = [
      ...existingPatients,
      { mr: 'MR000005', name: 'Test', parentName: 'Test', mobile: '1234567890', age: 0, gender: 'Male', bloodGroup: '', city: '', lastVisit: '', tags: [], visits: [], bills: [] },
    ]
    expect(generateMR(patients)).toBe('MR000006')
  })

  it('centersByPrefix maps MR correctly', () => {
    expect(centersByPrefix['MR']).toBe('Global')
  })

  it('searchFields includes MR placeholder', () => {
    expect(searchFields.map((f) => f.id)).toEqual(['mr', 'mobile', 'name', 'parent'])
    expect(searchFields[0].placeholder).toContain('MR000001')
  })

  it('all existing patients have valid MR format', () => {
    existingPatients.forEach((p) => {
      expect(p.mr).toMatch(/^MR\d{6}$/)
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
