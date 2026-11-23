import { Injectable } from '@nestjs/common';
import { RegistryAdapter } from '../ownership-verification.service';

/**
 * MockRegistryAdapter — used in development and testing.
 *
 * In production, replace with RealRegistryAdapter that calls the
 * institutional API (e.g., NIMC NIN verification API, state land registry).
 *
 * The mock returns a "found" record for NINs starting with "NIN-VALID-"
 * and confirms all witnesses whose IDs start with "WITNESS-OK-".
 */
@Injectable()
export class MockRegistryAdapter implements RegistryAdapter {
  async lookup(nationalId: string) {
    if (nationalId.startsWith('NIN-VALID-')) {
      return {
        ownerName:        'Adewale Okonkwo',
        nationalId,
        surveyPlanNumber: 'SP-' + nationalId.replace('NIN-VALID-', ''),
      };
    }
    return null;
  }

  async confirmWitnesses(witnesses: string[]): Promise<number> {
    return witnesses.filter(w => w.startsWith('WITNESS-OK-')).length;
  }
}
