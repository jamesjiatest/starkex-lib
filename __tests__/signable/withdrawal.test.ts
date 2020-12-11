/**
 * Unit tests for signable/withdrawals.ts.
 */

import {
  KeyPair,
  StarkwareWithdrawal,
  WithdrawalWithClientId,
  WithdrawalWithNonce,
} from '../../src/types';
import { generateKeyPairUnsafe } from '../../src/keys';
import { nonceFromClientId } from '../../src/helpers';
import { mutateHexStringAt } from './util';

// Module under test.
import { SignableWithdrawal } from '../../src/signable/withdrawal';

// Mock params.
const mockKeyPair: KeyPair = {
  publicKey: '3b865a18323b8d147a12c556bfb1d502516c325b1477a23ba6c77af31f020fd',
  privateKey: '58c7d5a90b1776bde86ebac077e053ed85b0f7164f53b080304a531947f46e3',
};
const mockWithdrawal: WithdrawalWithClientId = {
  positionId: '12345',
  humanAmount: '49.47802324992',
  expirationIsoTimestamp: '2020-09-17T04:15:55.028Z',
  clientId: 'This is an ID that the client came up with to describe this withdrawal',
};
const mockSignature = (
  '04baff76d91d155e6fbe8f5ff4a997cdd2b865506db10656fda040d94ca2f86c' +
  '03622618798e85ef45adf60dc16bac632bd4f7f21bb2aa88777d65ca0fc011b6'
);

describe('SignableWithdrawal', () => {

  describe('verifySignature()', () => {

    it('returns true for a valid signature', () => {
      const result = SignableWithdrawal
        .fromWithdrawal(mockWithdrawal)
        .verifySignature(mockSignature, mockKeyPair.publicKey);
      expect(result).toBe(true);
    });

    it('returns false for an invalid signature', () => {
      // Mutate a single character in r.
      for (let i = 0; i < 3; i++) {
        const badSignature: string = mutateHexStringAt(mockSignature, i);
        const result = SignableWithdrawal
          .fromWithdrawal(mockWithdrawal)
          .verifySignature(badSignature, mockKeyPair.publicKey);
        expect(result).toBe(false);
      }

      // Mutate a single character in s.
      for (let i = 0; i < 3; i++) {
        const badSignature: string = mutateHexStringAt(mockSignature, i + 64);
        const result = SignableWithdrawal
          .fromWithdrawal(mockWithdrawal)
          .verifySignature(badSignature, mockKeyPair.publicKey);
        expect(result).toBe(false);
      }
    });
  });

  describe('sign()', () => {

    it('signs a withdrawal', () => {
      const signature = SignableWithdrawal
        .fromWithdrawal(mockWithdrawal)
        .sign(mockKeyPair.privateKey);
      expect(signature).toEqual(mockSignature);
    });

    it('signs a withdrawal with nonce instead of clientId', () => {
      const withdrawalWithNonce: WithdrawalWithNonce = {
        ...mockWithdrawal,
        clientId: undefined,
        nonce: nonceFromClientId(mockWithdrawal.clientId),
      };
      const signature = SignableWithdrawal
        .fromWithdrawalWithNonce(withdrawalWithNonce)
        .sign(mockKeyPair.privateKey);
      expect(signature).toEqual(mockSignature);
    });

    it('generates a different signature when the client ID is different', () => {
      const withdrawal = {
        ...mockWithdrawal,
        clientId: `${mockWithdrawal.clientId}!`,
      };
      const signature = SignableWithdrawal
        .fromWithdrawal(withdrawal)
        .sign(mockKeyPair.privateKey);
      expect(signature).not.toEqual(mockSignature);
    });

    it('generates a different signature when the position ID is different', () => {
      const withdrawal = {
        ...mockWithdrawal,
        positionId: (Number.parseInt(mockWithdrawal.positionId, 10) + 1).toString(),
      };
      const signature = SignableWithdrawal
        .fromWithdrawal(withdrawal)
        .sign(mockKeyPair.privateKey);
      expect(signature).not.toEqual(mockSignature);
    });
  });

  describe('toStarkware()', () => {

    it('converts human amounts to quantum amounts', () => {
      const starkwareWithdrawal: StarkwareWithdrawal = SignableWithdrawal
        .fromWithdrawal(mockWithdrawal)
        .toStarkware();
      expect(starkwareWithdrawal.quantumsAmount).toEqual('4500');
    });
  });

  it('end-to-end', () => {
    // Repeat some number of times.
    for (let i = 0; i < 1; i++) {
      const keyPair: KeyPair = generateKeyPairUnsafe();
      const signableWithdrawal = SignableWithdrawal.fromWithdrawal(mockWithdrawal);
      const signature = signableWithdrawal.sign(keyPair.privateKey);

      // Expect to be valid when verifying with the right public key.
      expect(
        signableWithdrawal.verifySignature(signature, keyPair.publicKey),
      ).toBe(true);

      // Expect to be invalid when verifying with a different public key.
      expect(
        signableWithdrawal.verifySignature(signature, mockKeyPair.publicKey),
      ).toBe(false);
    }
  });
});