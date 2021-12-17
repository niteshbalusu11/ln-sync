const asyncAuto = require('async/auto');
const {cancelPendingChannel} = require('ln-service');
const {openChannels} = require('ln-service');
const {returnResult} = require('asyncjs-util');

/** Confirm that a peer will accept a channel open

  {
    capacity: <Channel Capacity Tokens Number>
    [cooperative_close_address]: <Restrict Coop Close To Address String>
    [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
    [is_private]: <Channel is Private Bool> // Defaults to false
    lnd: <Authenticated LND API Object>
    [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    [partner_csv_delay]: <Peer Output CSV Delay Number>
    partner_public_key: <Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    is_accepted: <Channel Proposal Is Accepted Bool>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.capacity) {
          return cbk([400, 'ExpectedCapacityOfChannelToTestAcceptance']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedLndToTestChannelOpenAcceptance']);
        }

        if (!args.partner_public_key) {
          return cbk([400, 'ExpectedPeerPublicKeyToTestChannelOpen']);
        }

        return cbk();
      },

      // Propose the channel
      propose: ['validate', ({}, cbk) => {
        return openChannels({
          channels: [{
            capacity: args.capacity,
            cooperative_close_address: args.cooperative_close_address,
            give_tokens: args.give_tokens,
            is_private: args.is_private,
            min_htlc_mtokens: args.min_htlc_mtokens,
            partner_csv_delay: args.partner_csv_delay,
            partner_public_key: args.partner_public_key,
          }],
          lnd: args.lnd,
        },
        cbk);
      }],

      // Cancel the channel proposal
      cancel: ['propose', ({propose}, cbk) => {
        const [{id}] = propose.pending;

        return cancelPendingChannel({id, lnd: args.lnd}, cbk);
      }],

      // Final result
      accepted: ['cancel', ({}, cbk) => {
        return cbk(null, {is_accepted: true});
      }],
    },
    returnResult({reject, resolve, of: 'accepted'}, cbk));
  });
};