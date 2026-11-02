"""Find recorded Part announcement matches using local decoded speech envelopes.
Not an estimator: correlation scores are evidence; timings require verified matches.
Run ets-audio.mjs first. No network or source modification.
"""
import json
import hashlib
from pathlib import Path
import numpy as np

root = Path(__file__).resolve().parent
data = json.loads((root / 'ets-audio.envelope.json').read_text())

def matches(signal, template, seconds=20):
    # Common Part title and directions start near the beginning of each cut.
    window = np.array(template[:seconds * 50], dtype=float)
    window -= window.mean()
    signal = np.array(signal, dtype=float)
    numerator = np.correlate(signal, window, mode='valid')
    sums = np.convolve(signal, np.ones(len(window)), mode='valid')
    squares = np.convolve(signal * signal, np.ones(len(window)), mode='valid')
    denominator = np.sqrt(np.maximum(1e-20, squares - sums * sums / len(window)) * (window * window).sum())
    score = numerator / denominator
    found=[]
    for _ in range(3):
        index=int(score.argmax()); found.append([round(index/50, 2), round(float(score[index]), 6)])
        score[max(0,index-50*60):index+50*60]=0
    return found

source_root=root.parent/'ETS 2024'/'AUDIO - ETS 2024'
output={
 'method':'Offline Chromium WebAudio decoded original MP3 to 16kHz mono; normalized RMS-envelope correlation at 50Hz against original Test01 Part cut announcements. No network upload or source modification.',
 'resolutionSeconds':.02,
 'boundaryPolicy':'Part1 begins at file start, preserving general instructions. Parts2–4 begin in the final verified 0.20-second quiet span before the matched Part announcement. Each Part ends at the next playback start; Part4 ends at decoded original duration.',
 'verification':'Recorded-speech waveform matching, not a human listening pass. Different title-to-directions pauses in Tests08/09 were resolved by matching the spoken title independently.',
 'tests':[]}
for test in range(6,11):
    rows=[]
    for part,offset,near,seconds in [(1,0,85,5),(2,.74,250,1),(3,4.52,780,1),(4,6.2,1850,1)]:
        signal=data[f'full-{test}']['rms'][near*50:(near+120)*50]
        match=matches(signal,data[f'cut-{part}']['rms'][round(offset*50):],seconds)[0]
        title=round(match[0]+near,2)
        if match[1]<.94: raise RuntimeError(f'Unverified {test}/{part}: {match}')
        quiet=[]
        if part>1:
            for n in range(round((title-1)*50),round(title*50)-9):
                if max(data[f'full-{test}']['rms'][n:n+10])<.001:quiet.append(n)
            if not quiet: raise RuntimeError(f'No verified gap before {test}/{part}')
        start=round(quiet[-1]/50,2) if quiet else 0
        rows.append({'number':part,'start':start,'evidence':{'template':f'PART {part} - TEST 1.mp3','templateOffset':offset,'matchedSpeechStart':title,'matchedSeconds':seconds,'correlation':match[1],'quietSpanSeconds':.2 if part>1 else None}})
    duration=data[f'full-{test}']['duration']
    for index,row in enumerate(rows):row['end']=rows[index+1]['start'] if index<3 else duration
    path=source_root/'AUDIO - FULL TEST'/f'Test_{test:02}.mp3'
    output['tests'].append({'id':test,'duration':duration,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':rows})
destination=root.parent/'data'/'ets-2024'/'audio-timings.json'
destination.write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
for test in output['tests']:print(test['id'],[(p['number'],p['start'],p['end'],p['evidence']['correlation']) for p in test['parts']])
