/* Writes the file pack of the course into labs/files/ and the reference numbers into
   labs/solutions/reference.json. Node 22, no dependencies, no randomness: the same bytes on
   every run. Run from anywhere:  node labs/_tools/prepare_files.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY, TRAVEL, travelCsv, frontier } from './world.mjs';
import * as D from './docs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = path.join(HERE, '..', 'files');
const SOLUTIONS = path.join(HERE, '..', 'solutions');
fs.mkdirSync(FILES, { recursive: true });
fs.mkdirSync(SOLUTIONS, { recursive: true });
const write = (name, text) => fs.writeFileSync(path.join(FILES, name), text.replace(/\r\n/g, '\n'), 'utf8');

const f = frontier();

write('prework_my_tasks.html', D.prework());
write('policy_travel_v2.html', D.policyV2());
write('policy_travel_v3.html', D.policyV3());
write('briefing_task.html', D.briefingTask());
write('delegation_card.html', D.delegationCard());
write('travel_q3.csv', travelCsv());
write('frontier_reference.html', D.frontierReference(f));
write('frontier_summary_sample.html', D.frontierSample(f));
write('frontier_trial_record.html', D.trialRecord());
write('ladder_requests.html', D.ladderRequests());
write('ladder_outputs_sample.html', D.ladderOutputs());
write('iteration_start.html', D.iterationStart());
write('iteration_transcript_sample.html', D.iterationTranscript());
write('conversation_stuck.html', D.conversationStuck());
write('five_outputs.html', D.fiveOutputs(f));
write('error_log.html', D.errorLog());
write('three_scenarios.html', D.threeScenarios());
write('briefing_final_sample.html', D.briefingFinal());
write('followup_log.html', D.followupLog());

const reference = { policy: POLICY, departments: TRAVEL.length, steps: D.TASK_STEPS.length, frontier: f };
fs.writeFileSync(path.join(SOLUTIONS, 'reference.json'), JSON.stringify(reference, null, 2) + '\n', 'utf8');
console.log(`wrote ${fs.readdirSync(FILES).length} files into labs/files and labs/solutions/reference.json`);
