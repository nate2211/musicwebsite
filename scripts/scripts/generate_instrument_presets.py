#!/usr/bin/env python3
"""Generate a deterministic enterprise factory preset bank for MusicStudioLab."""
from pathlib import Path
import json, random, math

random.seed(20260715)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "studio" / "data" / "instrumentPresets.js"

categories = {
    "808": ["Sub Monarch", "Chrome 808", "Velvet Sub", "Street Glide", "Night Trunk", "Rubber Bass", "Clean Sine", "Overdrive 808", "Tunnel Low", "Memphis Tail", "Deep Current", "Pressure Tube"],
    "Bass": ["Analog Weight", "Grime Reese", "Rubber Mono", "Midnight Moog", "Dirty Square", "Neon Bass", "Funk Circuit", "Low Voltage", "Wide Reese", "Plasma Bass", "Roundhouse", "Substance"],
    "Keys": ["Velvet Keys", "Tape Piano", "Glass Rhodes", "Dusty EP", "Noir Chords", "Moonlit Keys", "Cassette Piano", "Soft Tines", "Lounge Electric", "Memory Keys", "Rainy Room", "Afterhours EP"],
    "Pluck": ["Crystal Pluck", "Mallet Drop", "Wooden Pixel", "Trap Harp", "Neon Kalimba", "Silk Pluck", "Tiny Guitar", "Ice String", "Digital Thumb", "Muted Nylon", "Pearl Drop", "Cloud Pluck"],
    "Bell": ["Chrome Bell", "Midnight Bell", "Glass Tower", "Toy Celesta", "Haunted Bell", "Digital Chime", "Bronze Air", "Frozen Bell", "Temple Metal", "Soft Alarm", "Prism Bell", "Moon Chime"],
    "Lead": ["Siren Lead", "Vocal Razor", "Porta Star", "Laser Whine", "Street Synth", "Satin Lead", "Acid Flute", "Wide Mono", "Neon Cry", "Hollow Lead", "Tape Solo", "Electric Reed"],
    "Pad": ["Cloud Chamber", "Velvet Atmos", "Choir Haze", "Night Canvas", "Floating Tape", "Analog Mist", "Frozen Choir", "Dream Stack", "Aurora Pad", "Slow Motion", "Cinema Air", "Afterglow"],
    "Synth": ["Super Stack", "Pulse Engine", "Analog Crown", "Digital Silk", "Warm Poly", "Future Chord", "Hyper Saw", "Soft Square", "Circuit Bloom", "Tape Synth", "Prism Poly", "Retro Motion"],
    "Brass": ["Trap Brass", "Dark Horns", "Stadium Stack", "Muted Brass", "Synth Trombone", "Royal Hit", "Noir Horn", "Wide Section", "Dirty Trumpet", "Low Brass", "Cinematic Stab", "Victory Horn"],
    "Flute": ["Air Flute", "Bamboo Night", "Digital Breath", "Pan Drift", "Whistle Lead", "Ghost Flute", "Soft Recorder", "Woodwind Air", "Cloud Pipe", "Breath Stack", "Glass Flute", "Street Whistle"],
    "Texture": ["Vinyl Spirit", "Radio Dust", "Granular Rain", "Tape Ghost", "Dark Room", "Air Traffic", "Memory Noise", "Broken Signal", "Frost Texture", "Warm Static", "City Fog", "Digital Ash"],
    "Chord": ["Minor Stack", "Soul Chord", "Dark Seventh", "Dream Ninth", "Trap Choir", "Jazz Glass", "Wide Minor", "Neo Soul", "Suspended Air", "House Chord", "Noir Stab", "Tape Harmony"],
    "Arp": ["Midnight Runner", "Glass Steps", "Pulse Ladder", "Neon Sequence", "Tiny Motion", "Dark Orbit", "Digital Rain", "Trap Sequence", "Clockwork", "Hollow Steps", "Silver Run", "Prism Motion"],
    "FX": ["Riser Voice", "Downward Signal", "Impact Synth", "Laser Sweep", "Reverse Air", "Alarm Motion", "Sub Drop", "Noise Bend", "Digital Crash", "Portal Tone", "Tape Stop Synth", "Cinematic Pulse"],
    "Atmosphere": ["Ethereal Horizon", "Midnight Nebula", "Frozen Distance", "Infinite Air", "Dream Corridor", "Solar Mist", "Velvet Expanse", "Rain Cathedral", "Quiet Orbit", "Ocean Above", "Memory Field", "Blue Infinity"],
    "Cinematic": ["Titan Arrival", "Glass Fortress", "Ancient Signal", "Heroic Undercurrent", "Distant Empire", "Shadow Monument", "Ascension Bed", "Noir Orchestra", "Mechanical Dawn", "Falling Kingdom", "Suspense Engine", "Final Horizon"],
    "Hybrid": ["Organic Circuit", "Analog Orchestra", "Digital Strings", "Resonant Machine", "Electric Chamber", "Synthetic Wood", "Pulse Ensemble", "Harmonic Alloy", "Living Voltage", "Prism Mechanism", "Future Acoustic", "Neural Instrument"],
    "Choir": ["Human Halo", "Cathedral Breath", "Ghost Ensemble", "Velvet Voices", "Celestial Vowels", "Noir Choir", "Frozen Sopranos", "Ancient Men", "Synthetic Angels", "Hollow Hymn", "Dream Chorus", "Sacred Air"],
    "World": ["Desert Strings", "Bamboo Temple", "Nordic Bow", "African Glass", "Eastern Pluck", "Island Mallet", "Mountain Reed", "Ceremonial Drumtone", "Silk Road Drone", "Arctic Flute", "Jungle Resonance", "Nomad Chime"],
    "Motion": ["Orbiting Pulse", "Polyrhythm Cloud", "Elastic Sequence", "Rotating Glass", "Evolving Current", "Gravity Steps", "Phase Runner", "Kinetic Choir", "Moving Horizon", "Fractal Rhythm", "Breathing Machine", "Infinite Pattern"],
}

waves = ["sine", "triangle", "sawtooth", "square", "pulse25", "pulse12", "warmSaw", "organ", "hollow", "digital", "metallic", "vowel", "cinematic", "choir", "bowed", "glass", "air", "shimmer", "formant", "spectral"]

def clamp(x, lo, hi): return max(lo, min(hi, x))

def template(category, idx):
    t = idx / 11
    base = {
      "engineMode":"subtractive", "polyphony":16, "mono":False, "legato":False,
      "portamento":round(0.01 + t*0.11, 4), "masterTune":0, "voiceDrift":round(1+t*5,2),
      "velocityToAmp":round(0.58+t*0.25,3), "velocityToFilter":round(0.18+t*0.42,3),
      "keyTracking":round(0.25+t*0.42,3), "unison":1+(idx%4), "detune":3+(idx%6)*3,
      "stereo":round(0.12+(idx%5)*0.16,3), "phaseRandom":round((idx%4)*0.12,3),
      "oscA":{"enabled":True,"waveform":waves[(idx*2)%len(waves)],"octave":0,"semitone":0,"fine":0,"level":0.72,"pan":-0.06,"pulseWidth":0.5,"phase":0},
      "oscB":{"enabled":True,"waveform":waves[(idx*2+3)%len(waves)],"octave":0,"semitone":[-12,0,0,7,12][idx%5],"fine":(-1 if idx%2 else 1)*(3+idx%5*2),"level":round(0.12+(idx%5)*0.075,3),"pan":0.06,"pulseWidth":0.5,"phase":0.25},
      "oscC":{"enabled":idx%3==0,"waveform":waves[(idx*2+7)%len(waves)],"octave":1,"semitone":0,"fine":-7,"level":round(0.05+(idx%4)*0.03,3),"pan":0,"pulseWidth":0.5,"phase":0.5},
      "sub":{"enabled":idx%2==0,"waveform":"sine","octave":-1,"level":round(0.08+(idx%4)*0.055,3)},
      "noise":{"enabled":idx%4==0,"color":["pink","white","brown","blue"][idx%4],"level":round((idx%4)*0.018,3),"stereo":0.35},
      "layers":[
        {"id":"layer-a","name":"Layer A","enabled":idx%3==0,"waveform":["cinematic","bowed","glass","choir","spectral","air"][idx%6],"octave":0,"semitone":[0,7,12,-12,3,5][idx%6],"fine":-4-(idx%4),"level":round(0.1+(idx%4)*0.035,3),"pan":-0.18,"unison":2+idx%4,"detune":7+idx%5*3,"stereo":round(0.35+(idx%4)*0.12,3),"delay":round((idx%3)*0.008,3),"motion":round(0.08+(idx%5)*0.05,3),"motionRate":round(0.06+idx*0.018,3)},
        {"id":"layer-b","name":"Layer B","enabled":idx%4==0,"waveform":["choir","shimmer","formant","air","spectral","glass"][idx%6],"octave":[1,0,1,-1,2,0][idx%6],"semitone":[0,12,7,0,0,5][idx%6],"fine":4+(idx%5),"level":round(0.07+(idx%4)*0.028,3),"pan":0.18,"unison":3+idx%4,"detune":9+idx%5*3,"stereo":round(0.45+(idx%4)*0.12,3),"delay":round(0.012+(idx%4)*0.006,3),"motion":round(0.1+(idx%5)*0.055,3),"motionRate":round(0.045+idx*0.014,3)}
      ],
      "textureLayer":{"enabled":idx%5==0,"color":["pink","brown","blue","white"][idx%4],"level":round(0.018+(idx%4)*0.012,3),"highpass":120+idx*75,"lowpass":12000-idx*420,"resonance":round(0.35+(idx%4)*0.25,2),"stereo":round(0.52+(idx%4)*0.12,3),"motion":round(0.1+(idx%5)*0.05,3),"motionRate":round(0.045+idx*0.012,3)},
      "ampEnv":{"attack":round(0.003+t*0.09,4),"hold":0,"decay":round(0.08+t*0.52,3),"sustain":round(0.42+(idx%5)*0.1,3),"release":round(0.09+t*0.72,3),"curve":"exponential"},
      "filter1":{"enabled":True,"type":"lowpass","cutoff":int(700+idx*1250),"resonance":round(0.4+(idx%6)*0.8,2),"drive":round((idx%5)*0.06,3),"keyTrack":round(0.2+(idx%4)*0.14,3)},
      "filter2":{"enabled":idx%4==0,"type":["highpass","bandpass","notch"][idx%3],"cutoff":int(80+idx*120),"resonance":round(0.2+(idx%4)*0.6,2),"drive":0,"keyTrack":0},
      "filterRouting":"parallel" if idx%5==0 else "serial", "filterBlend":round(0.32+(idx%4)*0.12,3),
      "filterEnv":{"attack":round(0.003+t*0.06,4),"hold":0,"decay":round(0.12+t*0.48,3),"sustain":round(0.18+(idx%5)*0.12,3),"release":round(0.16+t*0.52,3),"amount":round(0.16+(idx%6)*0.12,3)},
      "pitchEnv":{"attack":0.001,"decay":round(0.04+t*0.12,3),"amount":0},
      "fm":{"enabled":idx%5==0,"source":"B","target":"A","ratio":[0.5,1,2,3,4][idx%5],"amount":round((idx%5)*0.04,3)},
      "ring":{"enabled":idx%7==0,"amount":round((idx%4)*0.06,3),"ratio":[0.5,1,1.5,2][idx%4]},
      "lfo1":{"enabled":True,"waveform":["sine","triangle","sawtooth","square"][idx%4],"rate":round(2.2+idx*0.42,3),"sync":idx%3==0,"division":["1/2","1/4","1/8","1/16"][idx%4],"amount":round((idx%5)*0.018,3),"target":"pitch","phase":0},
      "lfo2":{"enabled":idx%3==0,"waveform":"triangle","rate":round(0.12+idx*0.07,3),"sync":idx%4==0,"division":["1/1","1/2","1/4","1/8"][idx%4],"amount":round((idx%4)*0.05,3),"target":"filter","phase":0.25},
      "macros":{"character":round(0.15+(idx%5)*0.16,3),"brightness":round(0.28+(idx%6)*0.12,3),"motion":round((idx%5)*0.12,3),"width":round(0.22+(idx%5)*0.15,3)},
      "voiceFx":{"chorus":round((idx%4)*0.08,3),"chorusRate":round(0.18+(idx%5)*0.11,3),"chorusDepth":round(0.003+(idx%4)*0.0015,4),"bitcrush":round((idx%7==0)*0.12,3),"saturation":round(0.04+(idx%5)*0.08,3)},
      "arp":{"enabled":category=="Arp","mode":["up","down","upDown","random"][idx%4],"rate":["1/8","1/16","1/16T","1/32"][idx%4],"octaves":1+idx%3,"gate":round(0.48+(idx%5)*0.1,3)},
    }
    if category == "808":
        base.update({"mono":True,"legato":True,"polyphony":1,"unison":1+(idx%2),"stereo":0.05+(idx%3)*0.05,"portamento":round(0.02+idx*0.012,3)})
        base["oscA"].update({"waveform":["sine","triangle","sine","square"][idx%4],"level":0.9})
        base["oscB"].update({"waveform":["sine","triangle","square","warmSaw"][idx%4],"semitone":-12 if idx%3==0 else 0,"level":round(0.04+(idx%4)*0.08,3)})
        base["oscC"]["enabled"] = False
        base["sub"].update({"enabled":True,"level":round(0.12+(idx%4)*0.05,3)})
        base["ampEnv"].update({"attack":0.002+idx*0.001,"decay":0.08+idx*0.015,"sustain":0.62+(idx%4)*0.08,"release":0.08+idx*0.035})
        base["filter1"].update({"cutoff":500+idx*850,"resonance":0.35+(idx%4)*0.3})
        base["pitchEnv"].update({"amount":12 if idx%4==0 else 0,"decay":0.045+idx*0.008})
    elif category in ("Pad","Texture"):
        base["unison"] = 4+idx%5
        base["detune"] = 8+idx%6*3
        base["ampEnv"].update({"attack":round(0.18+idx*0.07,3),"decay":0.8+idx*0.09,"sustain":0.62,"release":1.2+idx*0.18})
        base["voiceFx"].update({"chorus":0.25+(idx%5)*0.1,"chorusDepth":0.006+(idx%4)*0.001})
        base["noise"].update({"enabled":True,"color":"pink","level":0.025+(idx%4)*0.015})
    elif category in ("Pluck","Bell"):
        base["ampEnv"].update({"attack":0.001,"decay":0.14+idx*0.045,"sustain":0.08+(idx%3)*0.06,"release":0.18+idx*0.07})
        base["filterEnv"].update({"amount":0.55,"decay":0.16+idx*0.04,"sustain":0.08})
        if category == "Bell":
            base["fm"].update({"enabled":True,"ratio":[2,2.5,3,4,5,6][idx%6],"amount":0.12+(idx%5)*0.08})
            base["oscA"]["waveform"]="sine"; base["oscB"]["waveform"]="sine"
    elif category == "Keys":
        base["ampEnv"].update({"attack":0.006+idx*0.003,"decay":0.35+idx*0.04,"sustain":0.42,"release":0.48+idx*0.06})
        base["oscA"]["waveform"]=["triangle","warmSaw","sine","organ"][idx%4]
        base["voiceFx"]["chorus"]=0.12+(idx%4)*0.08
    elif category == "Lead":
        base.update({"mono":True,"legato":True,"polyphony":1,"portamento":0.04+idx*0.014,"unison":2+idx%4})
        base["ampEnv"].update({"attack":0.004,"decay":0.14,"sustain":0.78,"release":0.2+idx*0.03})
    elif category == "Flute":
        base["oscA"]["waveform"]="sine"; base["oscB"]["waveform"]="triangle"
        base["noise"].update({"enabled":True,"color":"pink","level":0.04+(idx%4)*0.015})
        base["ampEnv"].update({"attack":0.035+idx*0.006,"decay":0.2,"sustain":0.82,"release":0.38})
    elif category == "Brass":
        base["unison"]=3+idx%4
        base["ampEnv"].update({"attack":0.025+idx*0.004,"decay":0.22,"sustain":0.78,"release":0.28})
        base["filterEnv"].update({"amount":0.62,"attack":0.035,"decay":0.25,"sustain":0.35})
    elif category == "Chord":
        base["unison"]=3+idx%3
        base["oscB"]["semitone"]=[3,4,5,7,10,12][idx%6]
        base["oscC"].update({"enabled":True,"semitone":[7,10,12,14][idx%4],"octave":0,"level":0.22})
    elif category == "FX":
        base["ampEnv"].update({"attack":0.02+idx*0.05,"decay":0.7,"sustain":0.2,"release":0.9})
        base["pitchEnv"].update({"amount":[-24,-12,12,24][idx%4],"decay":0.4+idx*0.1})
        base["noise"].update({"enabled":True,"color":["white","pink","blue"][idx%3],"level":0.08+(idx%5)*0.04})
    elif category in ("Atmosphere", "Cinematic", "Hybrid", "Choir", "World", "Motion"):
        base["engineMode"] = "spectral-hybrid" if category in ("Atmosphere", "Cinematic", "Choir") else "hybrid"
        base["layers"][0].update({"enabled":True,"level":0.18+(idx%4)*0.025,"unison":4+idx%4,"detune":10+idx%5*3,"motion":0.16+(idx%4)*0.07})
        base["layers"][1].update({"enabled":True,"level":0.12+(idx%4)*0.02,"unison":4+idx%5,"detune":12+idx%5*3,"motion":0.2+(idx%4)*0.06})
        base["textureLayer"].update({"enabled":True,"level":0.025+(idx%4)*0.012,"motion":0.2+(idx%4)*0.06})
        base["unison"] = 3+idx%5
        base["stereo"] = 0.48+(idx%4)*0.12
        base["voiceFx"].update({"chorus":0.28+(idx%4)*0.1,"chorusDepth":0.006+(idx%4)*0.0015,"saturation":0.04+(idx%4)*0.035})
        base["ampEnv"].update({"attack":0.08+idx*0.035,"decay":0.6+idx*0.06,"sustain":0.62+(idx%3)*0.08,"release":0.9+idx*0.14})
        if category == "Choir":
            base["oscA"]["waveform"]="choir"; base["oscB"]["waveform"]="formant"; base["layers"][0]["waveform"]="choir"; base["layers"][1]["waveform"]="air"
        elif category == "Cinematic":
            base["oscA"]["waveform"]="cinematic"; base["layers"][0]["waveform"]="bowed"; base["layers"][1]["waveform"]="shimmer"
            base["filter1"].update({"cutoff":2200+idx*520,"resonance":0.65+(idx%4)*0.35})
        elif category == "Atmosphere":
            base["oscA"]["waveform"]="air"; base["layers"][0]["waveform"]="shimmer"; base["layers"][1]["waveform"]="choir"
            base["ampEnv"].update({"attack":0.3+idx*0.07,"release":1.8+idx*0.18})
        elif category == "World":
            base["oscA"]["waveform"] = ["hollow", "bowed", "glass", "air"][idx % 4]
            base["layers"][0]["waveform"]=["bowed","hollow","glass","formant"][idx%4]
            base["ampEnv"].update({"attack":0.004+idx*0.006,"decay":0.28+idx*0.04,"sustain":0.28+(idx%3)*0.11,"release":0.45+idx*0.05})
        elif category == "Motion":
            base["arp"].update({"enabled":True,"mode":["up","down","upDown","random"][idx%4],"rate":["1/8","1/16","1/16T","1/32"][idx%4],"octaves":2+idx%3})
            base["lfo1"].update({"enabled":True,"sync":True,"target":"filter","amount":0.18+(idx%4)*0.08})
            base["lfo2"].update({"enabled":True,"sync":True,"target":"pan","amount":0.14+(idx%4)*0.07})
    return base

presets=[]
num=1
for category,names in categories.items():
    for idx,name in enumerate(names):
        p=template(category,idx)
        description = (
            f"Original layered {category.lower()} instrument with three core oscillators, dual spectral sources, "
            f"procedural texture, performance macros, and motion-ready modulation."
            if category in ("Atmosphere", "Cinematic", "Hybrid", "Choir", "World", "Motion")
            else f"Original enterprise {category.lower()} patch for modern production, with layered synthesis, modulation, and performance-ready macros."
        )
        p={"id":f"preset-{num:03d}","name":name,"category":category,"description":description,"author":"MusicStudioLab Factory",**p,"tags":[category.lower(),"enterprise","layered","factory","original","synth"]}
        presets.append(p); num+=1

text = "// Generated by scripts/generate_instrument_presets.py. All patches are original.\n"
text += "export const INSTRUMENT_PRESETS = " + json.dumps(presets, indent=2) + ";\n\n"
text += "export const PRESET_CATEGORIES = " + json.dumps(list(categories.keys()), indent=2) + ";\n"
OUT.write_text(text)
print(f"Generated {len(presets)} presets at {OUT}")
