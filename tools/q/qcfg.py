# конфіг козака: python3 qcfg2.py hero|soldier [sabre rot quaternion json]
import json,sys,math
S='/tmp/claude-0/-home-user/300cbde3-d79c-5c8c-9d93-ef6cb2adbad5/scratchpad'
O=S+'/dl/outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)'
U=S+'/dl/ubc/Universal Base Characters[Standard]';H=U+'/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)'
A1=S+'/dl/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';A2=S+'/dl/ual2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb'
mode=sys.argv[1];rot=json.loads(sys.argv[2]) if len(sys.argv)>2 else [0,0,0,1];tr=json.loads(sys.argv[3]) if len(sys.argv)>3 else [0,0,0]
MP=O+'/Modular Parts/Male_Ranger_'
c={'base':O+'/Outfits/Male_Peasant.gltf',
 'parts':[{'path':U+'/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf','head':True,'dropMat':'MI_Hair','name':'Head'},
   {'path':U+'/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf','head':'chest','dropMat':'MI_Hair|MI_Eyes','name':'Chest'},
   {'path':H+'/Hair_Beard.gltf','name':'Moustache','box':[{'xMax':.05,'yMin':1.607,'yMax':1.65,'zMin':.07},{'xMin':.028,'xMax':.06,'yMin':1.57,'yMax':1.625,'zMin':.045}]},
   {'path':H+'/Hair_Long.gltf','name':'Oseledets','box':[{'xMax':.04,'yMin':1.66,'zMax':.02},{'xMax':.03,'yMin':1.56,'zMax':-.02}]}]+
   [{'path':O+'/Modular Parts/Male_Peasant_Body.gltf','name':'Undershirt','shrink':.022}]+[{'path':O+'/Outfits/Male_Ranger.gltf'}],
 'chest':{'yMin':1.25,'shrink':.032},'hair':[.3,.2,.13],
 'texSwap':{'MI_Ranger':S+'/qb/T_Ranger_Brown.png'},
 'sabre':{'t':tr,'r':rot},
 'anims':{'Idle':[[A1,'Idle_Loop']],'Stand':[[A2,'Idle_FoldArms_Loop']],'Walk':[[A1,'Walk_Loop']],'Run':[[A1,'Jog_Fwd_Loop']],'Run_Map':[[A1,'Jog_Fwd_Loop']],
   'Attack_Slash':[[A1,'Sword_Attack']],'Attack':[[A1,'Pistol_Shoot']],'Block_Idle':[[A2,'Idle_Shield_Loop']],'Hit':[[A1,'Hit_Chest']],
   'Dying':[[A1,'Death01']],'Death':[[A1,'Death01']],'Dance':[[A1,'Dance_Loop',9]],'Entry':[[A2,'Sword_Regular_Combo'],[A2,'Yes'],[A2,'Sword_Heavy_Combo']],
   'Defeated':[[A2,'Idle_No_Loop'],[A1,'Crouch_Idle_Loop',2]],'Sad_Idle':[[A2,'Idle_No_Loop']],'SwordIdle':[[A1,'Sword_Idle']]},
 'tex':1024,'texSmall':256}
if mode=='soldier':c.update({'tex':512,'texSmall':128,'simplify':.2,'simplifyErr':.01,'resTol':5e-4});c['chest']={'yMin':1.36,'shrink':.032}
print(json.dumps(c))
