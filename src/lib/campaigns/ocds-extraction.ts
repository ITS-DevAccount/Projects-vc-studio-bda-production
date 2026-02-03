// ============================================================================
// BuildBid: OCDS Data Extraction Utilities
// Extract supplier/opportunity data from OCDS JSON files
// ============================================================================

import type { OCDSOpportunity, OCDSRelease } from '@/lib/types/ocds';

/**
 * Extract opportunities from OCDS data (handles both Release Package and Record Package formats)
 * @param ocdsData - Parsed OCDS JSON data
 * @returns Array of extracted opportunities
 */
export function extractOpportunities(ocdsData: any): OCDSOpportunity[] {
  let release: OCDSRelease | null = null;

  // Handle Release Package format
  if (ocdsData.releases && Array.isArray(ocdsData.releases) && ocdsData.releases.length > 0) {
    release = ocdsData.releases[0];
  }
  // Handle Record Package format
  else if (ocdsData.records && Array.isArray(ocdsData.records) && ocdsData.records.length > 0) {
    release = ocdsData.records[0].compiledRelease;
  } else {
    throw new Error('Invalid OCDS format: Expected releases array or records array with compiledRelease');
  }

  if (!release) {
    throw new Error('No release data found in OCDS file');
  }

  // Build party lookup map
  const parties: Record<string, any> = {};
  if (release.parties && Array.isArray(release.parties)) {
    release.parties.forEach((party: any) => {
      if (party.id) {
        parties[party.id] = party;
      }
    });
  }

  // Extract opportunities from awards
  const opportunities: OCDSOpportunity[] = [];
  const awards = release.awards || [];

  for (const award of awards) {
    const suppliers = award.suppliers || [];
    
    for (const supplierRef of suppliers) {
      const supplierId = supplierRef.id;
      const supplier = parties[supplierId] || supplierRef;

      // Get contract value from first contract
      let contractValue: number | null = null;
      let currency = 'GBP';
      const contracts = release.contracts || [];
      if (contracts.length > 0 && contracts[0].value) {
        const value = contracts[0].value;
        contractValue = value.amountGross || value.amount || null;
        currency = value.currency || 'GBP';
      }

      // Create opportunity
      const opportunity: OCDSOpportunity = {
        company_name: supplier.name || supplierRef.name || 'Unknown Company',
        contact_email: supplier.contactPoint?.email || null,
        contact_phone: supplier.contactPoint?.telephone || null,
        address: supplier.address || {},
        company_size: supplier.details?.scale || null,
        vcse: supplier.details?.vcse || false,
        tender_title: release.tender?.title || 'Unknown',
        tender_description: release.tender?.description || '',
        tender_ref: release.id || '',
        ocid: release.ocid || '',
        contract_value: contractValue,
        currency: currency,
        buyer_name: release.buyer?.name || 'Unknown',
        buyer_id: release.buyer?.id || '',
        status: 'pending',
        selected: false,
        error: null,
      };

      opportunities.push(opportunity);
    }
  }

  if (opportunities.length === 0) {
    throw new Error('No supplier/award data found in OCDS file');
  }

  return opportunities;
}

/**
 * Validate OCDS file structure before processing
 * @param ocdsData - Parsed OCDS JSON data
 * @returns true if valid, throws error if invalid
 */
export function validateOCDSStructure(ocdsData: any): boolean {
  if (!ocdsData || typeof ocdsData !== 'object') {
    throw new Error('Invalid OCDS file: Expected JSON object');
  }

  // Check for Release Package format
  if (ocdsData.releases && Array.isArray(ocdsData.releases)) {
    if (ocdsData.releases.length === 0) {
      throw new Error('OCDS file contains empty releases array');
    }
    return true;
  }

  // Check for Record Package format
  if (ocdsData.records && Array.isArray(ocdsData.records)) {
    if (ocdsData.records.length === 0) {
      throw new Error('OCDS file contains empty records array');
    }
    if (!ocdsData.records[0].compiledRelease) {
      throw new Error('OCDS Record Package missing compiledRelease');
    }
    return true;
  }

  throw new Error('Invalid OCDS format: Expected releases array or records array');
}


