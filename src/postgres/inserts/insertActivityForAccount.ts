import { updateCountLog } from '../postges-logger';
import { newPgError } from '../utils';
import { SubstrateEvent } from '../../substrate/types';
import { InsertActivityPromise } from '../queries/types';
import { getValidDate } from '../../substrate/subscribe';
import { pg } from '../../connections/postgres';

const query = `
  INSERT INTO df.activities(block_number, event_index, account, event, following_id, date, agg_count)
    VALUES($1, $2, $3, $4, $5, $6, $7)
  RETURNING *`

const queryUpdate = `
  UPDATE df.activities
    SET aggregated = false
      WHERE aggregated = true
        AND NOT (block_number = $1 AND event_index = $2)
        AND event = $3
        AND following_id = $4
  RETURNING *`;

export async function insertActivityForAccount(eventAction: SubstrateEvent, count: number): InsertActivityPromise {
  const { eventName, data, blockNumber, eventIndex } = eventAction;
  const accountId = data[0].toString();
  const followingId = data[1].toString();

  const date = await getValidDate(blockNumber)

  const params = [blockNumber, eventIndex, accountId, eventName, followingId, date, count];

  try {
    await pg.query(query, params)

    const paramsUpdate = [ blockNumber, eventIndex, eventName, followingId ];
    const resUpdate = await pg.query(queryUpdate, paramsUpdate);
    updateCountLog(resUpdate.rowCount)
  } catch (err) {
    throw newPgError(err, insertActivityForAccount)
  }

  return { blockNumber, eventIndex }
};