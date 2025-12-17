import { playWave, setWaveVolume } from '#3rdparty/audio.js';
import { stopMidi, setMidiVolume, playMidi } from '#3rdparty/tinymidipcm.js';

import { ClientCode } from '#/client/ClientCode.js';
import GameShell from '#/client/GameShell.js';
import InputTracking from '#/client/InputTracking.js';
import { MenuAction } from '#/client/MenuAction.js';
import MobileKeyboard from '#/client/MobileKeyboard.js';
import MouseTracking from '#/client/MouseTracking.js';

import FloType from '#/config/FloType.js';
import SeqType, { PostanimMove, PreanimMove, RestartMode } from '#/config/SeqType.js';
import LocType from '#/config/LocType.js';
import ObjType from '#/config/ObjType.js';
import NpcType from '#/config/NpcType.js';
import IdkType from '#/config/IdkType.js';
import SpotAnimType from '#/config/SpotAnimType.js';
import VarpType from '#/config/VarpType.js';
import VarBitType from '#/config/VarBitType.js';
import IfType from '#/config/IfType.js';
import { ComponentType, ButtonType } from '#/config/IfType.js';

import ClientBuild from '#/dash3d/ClientBuild.js';
import ClientEntity from '#/dash3d/ClientEntity.js';
import ClientLocAnim from '#/dash3d/ClientLocAnim.js';
import ClientNpc, { NpcUpdate } from '#/dash3d/ClientNpc.js';
import ClientObj from '#/dash3d/ClientObj.js';
import ClientPlayer, { PlayerUpdate } from '#/dash3d/ClientPlayer.js';
import ClientProj from '#/dash3d/ClientProj.js';
import CollisionMap, { CollisionConstants } from '#/dash3d/CollisionMap.js';
import { CollisionFlag } from '#/dash3d/CollisionFlag.js';
import { DirectionFlag } from '#/dash3d/DirectionFlag.js';
import { LocAngle } from '#/dash3d/LocAngle.js';
import LocChange from '#/dash3d/LocChange.js';
import { LocLayer } from '#/dash3d/LocLayer.js';
import LocShape from '#/dash3d/LocShape.js';
import { MapFlag } from '#/dash3d/MapFlag.js';
import MapSpotAnim from '#/dash3d/MapSpotAnim.js';
import World from '#/dash3d/World.js';

import JString from '#/datastruct/JString.js';
import LinkList from '#/datastruct/LinkList.js';

import { Int32Array2d, TypedArray1d, TypedArray3d, Int32Array3d, Uint8Array3d } from '#/util/Arrays.js';
import { downloadUrl, sleep, arraycopy } from '#/util/JsUtil.js';

import AnimFrame from '#/dash3d/AnimFrame.js';
import { canvas2d } from '#/graphics/Canvas.js';
import { Colors } from '#/graphics/Colors.js';
import Pix2D from '#/graphics/Pix2D.js';
import Pix3D from '#/graphics/Pix3D.js';
import Model from '#/dash3d/Model.js';
import Pix8 from '#/graphics/Pix8.js';
import Pix32 from '#/graphics/Pix32.js';
import PixFont from '#/graphics/PixFont.js';
import PixMap from '#/graphics/PixMap.js';

import ClientStream from '#/io/ClientStream.js';
import { ClientProt } from '#/io/ClientProt.js';
import Database from '#/io/Database.js';
import Isaac from '#/io/Isaac.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';
import OnDemand from '#/io/OnDemand.js';
import { ServerProt, ServerProtSizes } from '#/io/ServerProt.js';

import WordFilter from '#/wordenc/WordFilter.js';
import WordPack from '#/wordenc/WordPack.js';

import Wave from '#/sound/Wave.js';

const enum Constants {
    CLIENT_VERSION = 254,
    MAX_CHATS = 50,
    MAX_PLAYER_COUNT = 2048,
    LOCAL_PLAYER_INDEX = 2047
}

export class Client extends GameShell {
    static nodeId: number = 10;
    static membersWorld: boolean = true;
    static lowMem: boolean = false;

    static cyclelogic1: number = 0;
    static cyclelogic2: number = 0;
    static cyclelogic3: number = 0;
    static cyclelogic4: number = 0;
    static cyclelogic5: number = 0;
    static cyclelogic6: number = 0;
    static cyclelogic7: number = 0;
    static cyclelogic8: number = 0;
    static cyclelogic9: number = 0;
    static cyclelogic10: number = 0;

    static oplogic1: number = 0;
    static oplogic2: number = 0;
    static oplogic3: number = 0;
    static oplogic4: number = 0;
    static oplogic5: number = 0;
    static oplogic6: number = 0;
    static oplogic7: number = 0;
    static oplogic8: number = 0;
    static oplogic9: number = 0;
    static oplogic10: number = 0;

    private alreadyStarted: boolean = false;
    private errorStarted: boolean = false;
    private errorLoading: boolean = false;
    private errorHost: boolean = false;
    private errorMessage: string | null = null;

    // important client stuff
    public db: Database | null = null;
    private loopCycle: number = 0;
    private jagChecksum: number[] = [];
    private stream: ClientStream | null = null;
    private in: Packet = Packet.alloc(1);
    private out: Packet = Packet.alloc(1);
    private loginout: Packet = Packet.alloc(1);
    private serverSeed: bigint = 0n;
    private packetCycle: number = 0;
    private pendingLogout: number = 0;
    private systemUpdateTimer: number = 0;
    private randomIn: Isaac | null = null;
    private ptype: number = 0;
    private psize: number = 0;
    private ptype0: number = 0;
    private ptype1: number = 0;
    private ptype2: number = 0;

    // archives
    private jagTitle: Jagfile | null = null;

    // login screen properties
    private redrawFrame: boolean = true;
    private imageTitle2: PixMap | null = null;
    private imageTitle3: PixMap | null = null;
    private imageTitle4: PixMap | null = null;
    private imageTitle0: PixMap | null = null;
    private imageTitle1: PixMap | null = null;
    private imageTitle5: PixMap | null = null;
    private imageTitle6: PixMap | null = null;
    private imageTitle7: PixMap | null = null;
    private imageTitle8: PixMap | null = null;
    private imageTitlebox: Pix8 | null = null;
    private imageTitlebutton: Pix8 | null = null;
    private loginscreen: number = 0; // jag::oldscape::TitleScreen::m_loginscreen
    private loginSelect: number = 0; // jag::oldscape::TitleScreen::m_loginSelect
    private loginMes1: string = ''; // jag::oldscape::TitleScreen::m_loginMes1
    private loginMes2: string = ''; // jag::oldscape::TitleScreen::m_loginMes2
    private loginUser: string = ''; // jag::oldscape::TitleScreen::m_loginUser
    private loginPass: string = ''; // jag::oldscape::TitleScreen::m_loginPass

    // fonts
    private fontPlain11: PixFont | null = null;
    private fontPlain12: PixFont | null = null;
    private fontBold12: PixFont | null = null;
    private fontQuill8: PixFont | null = null;

    // login screen pillar flames properties
    private imageRunes: Pix8[] = [];
    private flameActive: boolean = false;
    private imageFlamesLeft: Pix32 | null = null;
    private imageFlamesRight: Pix32 | null = null;
    private flameBuffer1: Int32Array | null = null;
    private flameBuffer0: Int32Array | null = null;
    private flameBuffer3: Int32Array | null = null;
    private flameBuffer2: Int32Array | null = null;
    private flameGradient: Int32Array | null = null;
    private flameGradient0: Int32Array | null = null;
    private flameGradient1: Int32Array | null = null;
    private flameGradient2: Int32Array | null = null;
    private flameLineOffset: Int32Array = new Int32Array(256);
    private flameCycle0: number = 0;
    private flameGradientCycle0: number = 0;
    private flameGradientCycle1: number = 0;
    private flamesInterval: Timer | null = null;

    // game world properties
    private areaSidebar: PixMap | null = null;
    private areaMapback: PixMap | null = null;
    private areaViewport: PixMap | null = null;
    private areaChatback: PixMap | null = null;
    private areaBackbase1: PixMap | null = null;
    private areaBackbase2: PixMap | null = null;
    private areaBackhmid1: PixMap | null = null;
    private areaBackleft1: PixMap | null = null;
    private areaBackleft2: PixMap | null = null;
    private areaBackright1: PixMap | null = null;
    private areaBackright2: PixMap | null = null;
    private areaBacktop1: PixMap | null = null;
    private areaBackvmid1: PixMap | null = null;
    private areaBackvmid2: PixMap | null = null;
    private areaBackvmid3: PixMap | null = null;
    private areaBackhmid2: PixMap | null = null;
    private chatbackScanline: Int32Array | null = null;
    private sidebarScanline: Int32Array | null = null;
    private viewportScanline: Int32Array | null = null;
    private compassMaskLineOffsets: Int32Array = new Int32Array(33);
    private compassMaskLineLengths: Int32Array = new Int32Array(33);
    private minimapMaskLineOffsets: Int32Array = new Int32Array(151);
    private minimapMaskLineLengths: Int32Array = new Int32Array(151);

    private invback: Pix8 | null = null;
    private chatback: Pix8 | null = null;
    private mapback: Pix8 | null = null;
    private backbase1: Pix8 | null = null;
    private backbase2: Pix8 | null = null;
    private backhmid1: Pix8 | null = null;
    private sideicons: (Pix8 | null)[] = new TypedArray1d(13, null);
    private minimap: Pix32 | null = null;
    private compass: Pix32 | null = null;
    private mapedge: Pix32 | null = null;
    private mapscene: (Pix8 | null)[] = new TypedArray1d(50, null);
    private mapfunction: (Pix32 | null)[] = new TypedArray1d(50, null);
    private hitmarks: (Pix32 | null)[] = new TypedArray1d(20, null);
    private headicons: (Pix32 | null)[] = new TypedArray1d(20, null);
    private mapmarker1: Pix32 | null = null;
    private mapmarker2: Pix32 | null = null;
    private cross: (Pix32 | null)[] = new TypedArray1d(8, null);
    private mapdots1: Pix32 | null = null;
    private mapdots2: Pix32 | null = null;
    private mapdots3: Pix32 | null = null;
    private mapdots4: Pix32 | null = null;
    private scrollbar1: Pix8 | null = null;
    private scrollbar2: Pix8 | null = null;
    private redstone1: Pix8 | null = null;
    private redstone2: Pix8 | null = null;
    private redstone3: Pix8 | null = null;
    private redstone1h: Pix8 | null = null;
    private redstone2h: Pix8 | null = null;
    private redstone1v: Pix8 | null = null;
    private redstone2v: Pix8 | null = null;
    private redstone3v: Pix8 | null = null;
    private redstone1hv: Pix8 | null = null;
    private redstone2hv: Pix8 | null = null;

    private genderButton1: Pix32 | null = null;
    private genderButton2: Pix32 | null = null;

    private activeMapFunctions: (Pix32 | null)[] = new TypedArray1d(1000, null);

    private redrawSidebar: boolean = false;
    private redrawChatback: boolean = false;
    private redrawSideicons: boolean = false;
    private redrawPrivacySettings: boolean = false;
    private mainLayerId: number = -1;
    private dragCycles: number = 0;
    private crossMode: number = 0;
    private crossCycle: number = 0;
    private crossX: number = 0;
    private crossY: number = 0;
    private chatDisabled: number = 0;
    private menuVisible: boolean = false;
    private menuArea: number = 0;
    private menuX: number = 0;
    private menuY: number = 0;
    private menuWidth: number = 0;
    private menuHeight: number = 0;
    private menuSize: number = 0;
    private menuOption: string[] = [];
    private sideLayerId: number = -1;
    private chatLayerId: number = -1;
    private chatInterface: IfType = new IfType();
    private chatScrollHeight: number = 78;
    private chatScrollOffset: number = 0;
    private ignoreCount: number = 0;
    private ignoreName37: bigint[] = [];
    private hintType: number = 0;
    private hintNpc: number = 0;
    private hintOffsetX: number = 0;
    private hintOffsetZ: number = 0;
    private hintPlayer: number = 0;
    private hintTileX: number = 0;
    private hintTileZ: number = 0;
    private hintHeight: number = 0;
    private statXP: number[] = [];
    private statEffectiveLevel: number[] = [];
    private statBaseLevel: number[] = [];
    private levelExperience: number[] = [];
    private modalMessage: string | null = null;
    private flashingTab: number = -1;
    private sideTab: number = 3;
    private sideTabLayerId: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    private chatPublicMode: number = 0;
    private chatPrivateMode: number = 0;
    private chatTradeMode: number = 0;
    private scrollGrabbed: boolean = false;
    private scrollInputPadding: number = 0;
    private showSocialInput: boolean = false;
    private socialMessage: string = '';
    private socialInput: string = '';
    private socialInputType: number = 0;
    private chatbackInput: string = '';
    private chatbackInputOpen: boolean = false;
    private tutLayerId: number = -1;
    private messageText: (string | null)[] = new TypedArray1d(100, null);
    private messageSender: (string | null)[] = new TypedArray1d(100, null);
    private messageType: Int32Array = new Int32Array(100);
    private messageTextIds: Int32Array = new Int32Array(100);
    private privateMessageCount: number = 0;
    private splitPrivateChat: number = 0;
    private chatEffects: number = 0;
    private chatTyped: string = '';
    private overMainLayerId: number = 0;
    private overSideLayerId: number = 0;
    private overChatLayerId: number = 0;
    private objDragLayerId: number = 0;
    private objDragSlot: number = 0;
    private objDragArea: number = 0;
    private objGrabX: number = 0;
    private objGrabY: number = 0;
    private objDragCycles: number = 0;
    private objGrabThreshold: boolean = false;
    private objSelected: number = 0;
    private objSelectedSlot: number = 0;
    private objSelectedLayerId: number = 0;
    private objLayerId: number = 0;
    private objSelectedName: string | null = null;
    private selectedArea: number = 0;
    private selectedItem: number = 0;
    private selectedLayerId: number = 0;
    private selectedCycle: number = 0;
    private pressedContinueOption: boolean = false;
    private var: number[] = []; // jag::oldscape::ClientVarCache::m_var
    private varServ: number[] = []; // jag::oldscape::ClientVarCache::m_varServ
    private spellSelected: number = 0;
    private activeSpellId: number = 0;
    private activeSpellFlags: number = 0;
    private spellCaption: string | null = null;
    private oneMouseButton: number = 0;
    private menuAction: Int32Array = new Int32Array(500);
    private menuParamA: Int32Array = new Int32Array(500);
    private menuParamB: Int32Array = new Int32Array(500);
    private menuParamC: Int32Array = new Int32Array(500);
    private hoveredSlotParentId: number = 0;
    private hoveredSlot: number = 0;
    private lastOverLayerId: number = 0;
    private reportAbuseInput: string = '';
    private reportAbuseMuteOption: boolean = false;
    private reportAbuseLayerId: number = -1;
    private lastAddress: number = 0;
    private daysSinceLastLogin: number = 0;
    private daysSinceRecoveriesChanged: number = 0;
    private unreadMessages: number = 0;
    private activeMapFunctionCount: number = 0;
    private activeMapFunctionX: Int32Array = new Int32Array(1000);
    private activeMapFunctionZ: Int32Array = new Int32Array(1000);

    // scene
    private world: World | null = null;
    private sceneState: number = 0;
    private sceneDelta: number = 0;
    private sceneCycle: number = 0;
    private flagTileX: number = 0;
    private flagTileZ: number = 0;
    private macroCameraCycle: number = 0;
    private macroCameraX: number = 0;
    private macroCameraZ: number = 0;
    private macroCameraAngle: number = 0;
    private macroCameraXModifier: number = 2;
    private macroCameraZModifier: number = 2;
    private macroCameraAngleModifier: number = 1;
    private cameraPitchClamp: number = 0;
    private macroMinimapCycle: number = 0;
    private macroMinimapAngle: number = 0;
    private macroMinimapZoom: number = 0;
    private macroMinimapZoomModifier: number = 1;
    private macroMinimapAngleModifier: number = 2;
    private minimapLevel: number = -1;
    private zoneUpdateX: number = 0;
    private zoneUpdateZ: number = 0;
    private mapBuildCenterZoneX: number = 0;
    private mapBuildCenterZoneZ: number = 0;
    private mapBuildBaseX: number = 0;
    private mapBuildBaseZ: number = 0;
    private mapBuildPrevBaseX: number = 0;
    private mapBuildPrevBaseZ: number = 0;
    private mapBuildGroundData: (Uint8Array | null)[] | null = null; // m_mapBuildGroundData
    private mapBuildGroundFile: number[] = [];
    private mapBuildLocationData: (Uint8Array | null)[] | null = null; // m_mapBuildLocationData
    private mapBuildLocationFile: number[] = [];
    private mapBuildIndex: Int32Array | null = null;
    private withinTutorialIsland: boolean = false;
    private awaitingPlayerInfo: boolean = false;
    private textureBuffer: Int8Array = new Int8Array(16384);
    private levelCollisionMap: (CollisionMap | null)[] = new TypedArray1d(CollisionConstants.LEVELS, null);
    private orbitCameraPitch: number = 128;
    private orbitCameraYaw: number = 0;
    private orbitCameraYawVelocity: number = 0;
    private orbitCameraPitchVelocity: number = 0;
    private orbitCameraX: number = 0;
    private orbitCameraZ: number = 0;
    private minusedlevel: number = 0; // jag::oldscape::ClientBuild::minusedlevel
    private groundh: Int32Array[][] | null = null; // jag::oldscape::ClientBuild::m_groundh
    private mapl: Uint8Array[][] | null = null; // jag::oldscape::ClientBuild::m_mapl
    private tileLastOccupiedCycle: Int32Array[] = new Int32Array2d(CollisionConstants.SIZE, CollisionConstants.SIZE);
    private projectX: number = 0;
    private projectY: number = 0;
    private cinemaCam: boolean = false;
    private cinemaX: number = 0;
    private cinemaY: number = 0;
    private cinemaZ: number = 0;
    private cinemaPitch: number = 0;
    private cinemaYaw: number = 0;
    private camShakeCycle: Int32Array = new Int32Array(5);
    private camShake: boolean[] = new TypedArray1d(5, false);
    private camShakeAxis: Int32Array = new Int32Array(5);
    private camShakeRan: Int32Array = new Int32Array(5);
    private camShakeAmp: Int32Array = new Int32Array(5);
    private camLookAtLx: number = 0;
    private camLookAtLz: number = 0;
    private camLookAtHei: number = 0;
    private camLookAtRate: number = 0;
    private camLookAtRate2: number = 0;
    private camMoveToLx: number = 0;
    private camMoveToLz: number = 0;
    private camMoveToHei: number = 0;
    private camMoveToRate: number = 0;
    private camMoveToRate2: number = 0;

    // entities
    private players: (ClientPlayer | null)[] = new TypedArray1d(Constants.MAX_PLAYER_COUNT, null);
    private playerCount: number = 0;
    private playerIds: Int32Array = new Int32Array(Constants.MAX_PLAYER_COUNT);
    private entityUpdateCount: number = 0;
    private entityRemovalCount: number = 0;
    private entityUpdateIds: Int32Array = new Int32Array(Constants.MAX_PLAYER_COUNT);
    private entityRemovalIds: Int32Array = new Int32Array(1000);
    private playerAppearanceBuffer: (Packet | null)[] = new TypedArray1d(Constants.MAX_PLAYER_COUNT, null);
    private npc: (ClientNpc | null)[] = new TypedArray1d(16384, null);
    private npcCount: number = 0;
    private npcIds: Int32Array = new Int32Array(16384);
    private projectiles: LinkList = new LinkList();
    private spotanims: LinkList = new LinkList();
    private objStacks: (LinkList | null)[][][] = new TypedArray3d(CollisionConstants.LEVELS, CollisionConstants.SIZE, CollisionConstants.SIZE, null);
    private locChanges: LinkList = new LinkList();

    // bfs pathfinder
    private bfsStepX: Int32Array = new Int32Array(4000);
    private bfsStepZ: Int32Array = new Int32Array(4000);
    private bfsDirection: Int32Array = new Int32Array(CollisionConstants.SIZE * CollisionConstants.SIZE);
    private bfsCost: Int32Array = new Int32Array(CollisionConstants.SIZE * CollisionConstants.SIZE);
    private tryMoveNearest: number = 0;

    // player
    private localPlayer: ClientPlayer | null = null;
    private runenergy: number = 0;
    private inMultizone: number = 0;
    private localPid: number = -1;
    private runweight: number = 0;
    private noTimeoutCycle: number = 0;
    private staffmodlevel: number = 0;
    private designGender: boolean = true;
    private updateDesignModel: boolean = false;
    private designKits: Int32Array = new Int32Array(7);
    private designColours: Int32Array = new Int32Array(5);

    // friends/chats
    static readonly CHAT_COLORS = Int32Array.of(Colors.YELLOW, Colors.RED, Colors.GREEN, Colors.CYAN, Colors.MAGENTA, Colors.WHITE);
    private friendCount: number = 0;
    private chatCount: number = 0;
    private chatX: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatY: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatHeight: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatWidth: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatColors: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatEffect: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chatTimers: Int32Array = new Int32Array(Constants.MAX_CHATS);
    private chats: (string | null)[] = new TypedArray1d(Constants.MAX_CHATS, null);
    private friendName: (string | null)[] = new TypedArray1d(200, null);
    private friendName37: BigInt64Array = new BigInt64Array(200);
    private friendWorld: Int32Array = new Int32Array(200);
    private socialName37: bigint | null = null;

    // audio
    private waveCount: number = 0;
    private waveEnabled: boolean = true;
    private waveIds: Int32Array = new Int32Array(50);
    private waveLoops: Int32Array = new Int32Array(50);
    private waveDelay: Int32Array = new Int32Array(50);
    private waveVolume: number = 64;
    private lastWaveId: number = -1;
    private lastWaveLoops: number = -1;
    private lastWaveLength: number = 0;
    private lastWaveStartTime: number = 0;
    private nextMusicDelay: number = 0;
    private midiActive: boolean = true;
    private midiVolume: number = 64;
    private midiSong: number = -1;
    private midiFading: boolean = false;
    private nextMidiSong: number = -1;

    private displayFps: boolean = false;

    private onDemand: OnDemand | null = null;
    ingame: boolean = false;
    modIcons: Pix8[] = [];
    lastProgressPercent: number = 0;
    lastProgressMessage: string = '';
    drawCycle: number = 0;
    sceneLoadStartTime: number = 0;
    mainOverlayLayerId: number = -1;
    bankArrangeMode: number = 0;
    warnMembersInNonMembers: number = 0;
    membersAccount: number = 0;
    flameCycle: number = 0;
    prevMouseClickTime: number = 0;
    sendCameraDelay: number = 0;
    sendCamera: boolean = false;
    focused: boolean = false;
    playerOp: (string | null)[] = new TypedArray1d(5, null);
    playerOpPriority: boolean[] = new TypedArray1d(5, false);
    mouseTracking: MouseTracking = new MouseTracking(this);
    mouseTracked: boolean = false;
    mouseTrackedX: number = 0;
    mouseTrackedY: number = 0;
    mouseTrackedDelta: number = 0;
    friendListStatus: number = 0;

    // ----

    private initializeLevelExperience(): void {
        let acc: number = 0;
        for (let i: number = 0; i < 99; i++) {
            const level: number = i + 1;
            const delta: number = (level + Math.pow(2.0, level / 7.0) * 300.0) | 0;
            acc += delta;
            this.levelExperience[i] = (acc / 4) | 0;
        }
    }

    constructor(nodeid: number, lowmem: boolean, members: boolean) {
        super();

        if (typeof nodeid === 'undefined' || typeof lowmem === 'undefined' || typeof members === 'undefined') {
            return;
        }

        console.log(`RS2 user client - release #${Constants.CLIENT_VERSION}`);

        Client.nodeId = nodeid;
        Client.membersWorld = members;

        if (lowmem) {
            Client.setLowMem();
        } else {
            Client.setHighMem();
        }

        if (typeof process.env.SECURE_ORIGIN !== 'undefined' && process.env.SECURE_ORIGIN !== 'false' && window.location.hostname !== process.env.SECURE_ORIGIN) {
            this.errorHost = true;
        }

        this.run();
    }

    static setLowMem(): void {
        World.lowMem = true;
        Pix3D.lowMem = true;
        Client.lowMem = true;
        ClientBuild.lowMem = true;
    }

    static setHighMem(): void {
        World.lowMem = false;
        Pix3D.lowMem = false;
        Client.lowMem = false;
        ClientBuild.lowMem = false;
    }

    saveMidi(fading: boolean, data: Uint8Array) {
        playMidi(data, this.midiVolume, fading);
    }

    // ----

    async load() {
        if (this.isMobile && Client.lowMem) {
            // force mobile on low detail mode to 30 fps
            this.setTargetedFramerate(30);
        }

        if (this.alreadyStarted) {
            this.errorStarted = true;
            return;
        }

        this.alreadyStarted = true;

        try {
            this.db = new Database(await Database.openDatabase());
        } catch (err) {
            // possibly incognito mode
            this.db = null;
        }

        try {
            await this.drawProgress(10, 'Connecting to web server');

            const checksums: Packet = new Packet(await downloadUrl('/crc'));
            for (let i: number = 0; i < 9; i++) {
                this.jagChecksum[i] = checksums.g4();
            }

            this.jagTitle = await this.getJagFile('title', 'title screen', 1, 25);
            this.fontPlain11 = PixFont.fromArchive(this.jagTitle, 'p11');
            this.fontPlain12 = PixFont.fromArchive(this.jagTitle, 'p12');
            this.fontBold12 = PixFont.fromArchive(this.jagTitle, 'b12');
            this.fontQuill8 = PixFont.fromArchive(this.jagTitle, 'q8');

            await this.loadTitleBackground();
            this.loadTitleImages();

            const jagConfig: Jagfile = await this.getJagFile('config', 'config', 2, 30);
            const jagInterface: Jagfile = await this.getJagFile('interface', 'interface', 3, 35);
            const jagMedia: Jagfile = await this.getJagFile('media', '2d graphics', 4, 40);
            const jagTextures: Jagfile = await this.getJagFile('textures', 'textures', 6, 45);
            const jagWordenc: Jagfile = await this.getJagFile('wordenc', 'chat system', 7, 50);
            const jagSounds: Jagfile = await this.getJagFile('sounds', 'sound effects', 8, 55);

            this.mapl = new Uint8Array3d(CollisionConstants.LEVELS, CollisionConstants.SIZE, CollisionConstants.SIZE);
            this.groundh = new Int32Array3d(CollisionConstants.LEVELS, CollisionConstants.SIZE + 1, CollisionConstants.SIZE + 1);
            this.world = new World(this.groundh, CollisionConstants.SIZE, CollisionConstants.LEVELS, CollisionConstants.SIZE);
            for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
                this.levelCollisionMap[level] = new CollisionMap();
            }
            this.minimap = new Pix32(512, 512);

            const versionlist: Jagfile = await this.getJagFile('versionlist', 'update list', 5, 60);

            await this.drawProgress(60, 'Connecting to update server');

            this.onDemand = new OnDemand(versionlist, this);
            AnimFrame.init(this.onDemand.getAnimCount());
            Model.init(this.onDemand.getFileCount(0), this.onDemand);

            await this.drawProgress(62, 'Preloading cache');
            await this.onDemand.prefetchAll();

            if (!Client.lowMem) {
                this.midiSong = 0; // scape_main
                this.midiFading = false;
                this.onDemand.request(2, this.midiSong);

                while (this.onDemand.remaining() > 0) {
                    await this.onDemandLoop();
                    await sleep(100);
                }
            }

            await this.drawProgress(65, 'Requesting animations');

            const animCount = this.onDemand.getFileCount(1);
            for (let i = 0; i < animCount; i++) {
                this.onDemand.request(1, i);
            }

            while (this.onDemand.remaining() > 0) {
                const progress = animCount - this.onDemand.remaining();
                if (progress > 0) {
                    await this.drawProgress(65, 'Loading animations - ' + ((progress * 100 / animCount) | 0) + '%');
                }

                await this.onDemandLoop();
                await sleep(100);
            }

            await this.drawProgress(70, 'Requesting models');

            const modelCount = this.onDemand.getFileCount(0);
            for (let i = 0; i < modelCount; i++) {
                const flags = this.onDemand.getModelFlags(i);
                if ((flags & 0x1) != 0) {
                    this.onDemand.request(0, i);
                }
            }

            const modelPrefetch = this.onDemand.remaining();
            while (this.onDemand.remaining() > 0) {
                const progress = modelPrefetch - this.onDemand.remaining();
                if (progress > 0) {
                    await this.drawProgress(70, 'Loading models - ' + ((progress * 100 / modelPrefetch) | 0) + '%');
                }

                await this.onDemandLoop();
                await sleep(100);
            }

            if (this.db) {
                await this.drawProgress(75, 'Requesting maps');

                this.onDemand.request(3, this.onDemand.getMapFile(47, 48, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(47, 48, 1));

                this.onDemand.request(3, this.onDemand.getMapFile(48, 48, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(48, 48, 1));

                this.onDemand.request(3, this.onDemand.getMapFile(49, 48, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(49, 48, 1));

                this.onDemand.request(3, this.onDemand.getMapFile(47, 47, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(47, 47, 1));

                this.onDemand.request(3, this.onDemand.getMapFile(48, 47, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(48, 47, 1));

                this.onDemand.request(3, this.onDemand.getMapFile(148, 48, 0));
                this.onDemand.request(3, this.onDemand.getMapFile(148, 48, 1));

                const mapPrefetch = this.onDemand.remaining();
                while (this.onDemand.remaining() > 0) {
                    const progress = mapPrefetch - this.onDemand.remaining();
                    if (progress > 0) {
                        await this.drawProgress(75, 'Loading maps - ' + ((progress * 100 / mapPrefetch) | 0) + '%');
                    }

                    await this.onDemandLoop();
                    await sleep(100);
                }
            }

            const modelCount2 = this.onDemand.getFileCount(0);
            for (let i = 0; i < modelCount2; i++) {
                let flags = this.onDemand.getModelFlags(i);

                let priority = 0;
                if ((flags & 0x8) != 0) {
                    priority = 10;
                } else if ((flags & 0x20) != 0) {
                    priority = 9;
                } else if ((flags & 0x10) != 0) {
                    priority = 8;
                } else if ((flags & 0x40) != 0) {
                    priority = 7;
                } else if ((flags & 0x80) != 0) {
                    priority = 6;
                } else if ((flags & 0x2) != 0) {
                    priority = 5;
                } else if ((flags & 0x4) != 0) {
                    priority = 4;
                }

                if ((flags & 0x1) != 0) {
                    priority = 3;
                }

                if (priority != 0) {
                    this.onDemand.requestModel(i);
                    // await this.onDemand.prefetchPriority(0, i, priority);
                }
            }

            await this.onDemand.prefetchMaps(Client.membersWorld);

            if (!Client.lowMem) {
                const midiCount = this.onDemand.getFileCount(2);
                for (let i = 0; i < midiCount; i++) {
                    if (this.onDemand.shouldPrefetchMidi(i)) {
                        this.onDemand.prefetchPriority(2, i, 1);
                    }
                }
            }

            await this.drawProgress(80, 'Unpacking media');

            this.invback = Pix8.load(jagMedia, 'invback', 0);
            this.chatback = Pix8.load(jagMedia, 'chatback', 0);
            this.mapback = Pix8.load(jagMedia, 'mapback', 0);

            this.backbase1 = Pix8.load(jagMedia, 'backbase1', 0);
            this.backbase2 = Pix8.load(jagMedia, 'backbase2', 0);
            this.backhmid1 = Pix8.load(jagMedia, 'backhmid1', 0);

            for (let i: number = 0; i < 13; i++) {
                this.sideicons[i] = Pix8.load(jagMedia, 'sideicons', i);
            }

            this.compass = Pix32.load(jagMedia, 'compass', 0);

            this.mapedge = Pix32.load(jagMedia, 'mapedge', 0);
            this.mapedge.trim();

            try {
                for (let i: number = 0; i < 50; i++) {
                    this.mapscene[i] = Pix8.load(jagMedia, 'mapscene', i);
                }
            } catch (e) {
                /* empty */
            }

            try {
                for (let i: number = 0; i < 50; i++) {
                    this.mapfunction[i] = Pix32.load(jagMedia, 'mapfunction', i);
                }
            } catch (e) {
                /* empty */
            }

            try {
                for (let i: number = 0; i < 20; i++) {
                    this.hitmarks[i] = Pix32.load(jagMedia, 'hitmarks', i);
                }
            } catch (e) {
                /* empty */
            }

            try {
                for (let i: number = 0; i < 20; i++) {
                    this.headicons[i] = Pix32.load(jagMedia, 'headicons', i);
                }
            } catch (e) {
                /* empty */
            }

            this.mapmarker1 = Pix32.load(jagMedia, 'mapmarker', 0);
            this.mapmarker2 = Pix32.load(jagMedia, 'mapmarker', 1);

            for (let i: number = 0; i < 8; i++) {
                this.cross[i] = Pix32.load(jagMedia, 'cross', i);
            }

            this.mapdots1 = Pix32.load(jagMedia, 'mapdots', 0);
            this.mapdots2 = Pix32.load(jagMedia, 'mapdots', 1);
            this.mapdots3 = Pix32.load(jagMedia, 'mapdots', 2);
            this.mapdots4 = Pix32.load(jagMedia, 'mapdots', 3);

            this.scrollbar1 = Pix8.load(jagMedia, 'scrollbar', 0);
            this.scrollbar2 = Pix8.load(jagMedia, 'scrollbar', 1);

            this.redstone1 = Pix8.load(jagMedia, 'redstone1', 0);
            this.redstone2 = Pix8.load(jagMedia, 'redstone2', 0);
            this.redstone3 = Pix8.load(jagMedia, 'redstone3', 0);

            this.redstone1h = Pix8.load(jagMedia, 'redstone1', 0);
            this.redstone1h?.hflip();

            this.redstone2h = Pix8.load(jagMedia, 'redstone2', 0);
            this.redstone2h?.hflip();

            this.redstone1v = Pix8.load(jagMedia, 'redstone1', 0);
            this.redstone1v?.vflip();

            this.redstone2v = Pix8.load(jagMedia, 'redstone2', 0);
            this.redstone2v?.vflip();

            this.redstone3v = Pix8.load(jagMedia, 'redstone3', 0);
            this.redstone3v?.vflip();

            this.redstone1hv = Pix8.load(jagMedia, 'redstone1', 0);
            this.redstone1hv?.hflip();
            this.redstone1hv?.vflip();

            this.redstone2hv = Pix8.load(jagMedia, 'redstone2', 0);
            this.redstone2hv?.hflip();
            this.redstone2hv?.vflip();

            for (let i = 0; i < 2; i++) {
                this.modIcons[i] = Pix8.load(jagMedia, 'mod_icons', i);
            }

            const backleft1: Pix32 = Pix32.load(jagMedia, 'backleft1', 0);
            this.areaBackleft1 = new PixMap(backleft1.wi, backleft1.hi);
            backleft1.quickPlotSprite(0, 0);

            const backleft2: Pix32 = Pix32.load(jagMedia, 'backleft2', 0);
            this.areaBackleft2 = new PixMap(backleft2.wi, backleft2.hi);
            backleft2.quickPlotSprite(0, 0);

            const backright1: Pix32 = Pix32.load(jagMedia, 'backright1', 0);
            this.areaBackright1 = new PixMap(backright1.wi, backright1.hi);
            backright1.quickPlotSprite(0, 0);

            const backright2: Pix32 = Pix32.load(jagMedia, 'backright2', 0);
            this.areaBackright2 = new PixMap(backright2.wi, backright2.hi);
            backright2.quickPlotSprite(0, 0);

            const backtop1: Pix32 = Pix32.load(jagMedia, 'backtop1', 0);
            this.areaBacktop1 = new PixMap(backtop1.wi, backtop1.hi);
            backtop1.quickPlotSprite(0, 0);

            const backvmid1: Pix32 = Pix32.load(jagMedia, 'backvmid1', 0);
            this.areaBackvmid1 = new PixMap(backvmid1.wi, backvmid1.hi);
            backvmid1.quickPlotSprite(0, 0);

            const backvmid2: Pix32 = Pix32.load(jagMedia, 'backvmid2', 0);
            this.areaBackvmid2 = new PixMap(backvmid2.wi, backvmid2.hi);
            backvmid2.quickPlotSprite(0, 0);

            const backvmid3: Pix32 = Pix32.load(jagMedia, 'backvmid3', 0);
            this.areaBackvmid3 = new PixMap(backvmid3.wi, backvmid3.hi);
            backvmid3.quickPlotSprite(0, 0);

            const backhmid2: Pix32 = Pix32.load(jagMedia, 'backhmid2', 0);
            this.areaBackhmid2 = new PixMap(backhmid2.wi, backhmid2.hi);
            backhmid2.quickPlotSprite(0, 0);

            const randR: number = ((Math.random() * 21.0) | 0) - 10;
            const randG: number = ((Math.random() * 21.0) | 0) - 10;
            const randB: number = ((Math.random() * 21.0) | 0) - 10;
            const rand: number = ((Math.random() * 41.0) | 0) - 20;

            for (let i: number = 0; i < 50; i++) {
                if (this.mapfunction[i]) {
                    this.mapfunction[i]?.rgbAdjust(randR + rand, randG + rand, randB + rand);
                }

                if (this.mapscene[i]) {
                    this.mapscene[i]?.rgbAdjust(randR + rand, randG + rand, randB + rand);
                }
            }

            await this.drawProgress(83, 'Unpacking textures');

            Pix3D.unpackTextures(jagTextures);
            Pix3D.initColourTable(0.8);
            Pix3D.initPool(20);

            await this.drawProgress(86, 'Unpacking config');

            SeqType.unpack(jagConfig);
            LocType.unpack(jagConfig);
            FloType.unpack(jagConfig);
            ObjType.unpack(jagConfig, Client.membersWorld);
            NpcType.unpack(jagConfig);
            IdkType.unpack(jagConfig);
            SpotAnimType.unpack(jagConfig);
            VarpType.unpack(jagConfig);
            VarBitType.unpack(jagConfig);

            if (!Client.lowMem) {
                await this.drawProgress(90, 'Unpacking sounds');
                Wave.unpack(jagSounds);
            }

            await this.drawProgress(95, 'Unpacking interfaces');

            IfType.unpack(jagInterface, jagMedia, [this.fontPlain11, this.fontPlain12, this.fontBold12, this.fontQuill8]);

            await this.drawProgress(100, 'Preparing game engine');

            for (let y: number = 0; y < 33; y++) {
                let left: number = 999;
                let right: number = 0;

                for (let x: number = 0; x < 34; x++) {
                    if (this.mapback.data[x + y * this.mapback.wi] === 0) {
                        if (left === 999) {
                            left = x;
                        }
                    } else if (left !== 999) {
                        right = x;
                        break;
                    }
                }

                this.compassMaskLineOffsets[y] = left;
                this.compassMaskLineLengths[y] = right - left;
            }

            for (let y: number = 5; y < 156; y++) {
                let left: number = 999;
                let right: number = 0;

                for (let x: number = 25; x < 172; x++) {
                    if (this.mapback.data[x + y * this.mapback.wi] === 0 && (x > 34 || y > 34)) {
                        if (left === 999) {
                            left = x;
                        }
                    } else if (left !== 999) {
                        right = x;
                        break;
                    }
                }

                this.minimapMaskLineOffsets[y - 5] = left - 25;
                this.minimapMaskLineLengths[y - 5] = right - left;
            }

            Pix3D.initWH(479, 96);
            this.chatbackScanline = Pix3D.scanline;

            Pix3D.initWH(190, 261);
            this.sidebarScanline = Pix3D.scanline;

            Pix3D.initWH(512, 334);
            this.viewportScanline = Pix3D.scanline;

            const distance: Int32Array = new Int32Array(9);
            for (let x: number = 0; x < 9; x++) {
                const angle: number = x * 32 + 128 + 15;
                const offset: number = angle * 3 + 600;
                const sin: number = Pix3D.sinTable[angle];
                distance[x] = (offset * sin) >> 16;
            }

            World.init(512, 334, 500, 800, distance);
            WordFilter.unpack(jagWordenc);

            setInterval(() => {
                this.mouseTracking.cycle();
            }, 50);

            this.initializeLevelExperience();
        } catch (err) {
            console.error(err);

            if (err instanceof Error) {
                this.errorMessage = `loaderror - ${this.lastProgressMessage} ${this.lastProgressPercent}%: ${err.message}`;
            }

            this.errorLoading = true;
        }
    }

    async loop() {
        if (this.errorStarted || this.errorLoading || this.errorHost) {
            return;
        }

        this.loopCycle++;

        if (this.ingame) {
            await this.gameLoop();
        } else {
            await this.titleScreenLoop();
        }

        await this.onDemandLoop();
    }

    async draw() {
        if (this.errorStarted || this.errorLoading || this.errorHost) {
            this.drawError();
            return;
        }

        this.drawCycle++;

        if (this.ingame) {
            this.gameDraw();
        } else {
            await this.titleScreenDraw();
        }

        this.dragCycles = 0;
    }

    refresh() {
        this.redrawFrame = true;
    }

    // ----

    async drawProgress(percent: number, message: string): Promise<void> {
        console.log(`${percent}%: ${message}`);

        this.lastProgressPercent = percent;
        this.lastProgressMessage = message;

        await this.loadTitle();

        if (!this.jagTitle) {
            await super.drawProgress(percent, message);
            return;
        }

        this.imageTitle4?.bind();

        const x: number = 360;
        const y: number = 200;

        const offsetY: number = 20;
        this.fontBold12?.centreString((x / 2) | 0, ((y / 2) | 0) - offsetY - 26, 'RuneScape is loading - please wait...', Colors.WHITE);

        const midY: number = ((y / 2) | 0) - 18 - offsetY;
        Pix2D.drawRect(((x / 2) | 0) - 152, midY, 304, 34, Colors.PROGRESS_RED);
        Pix2D.drawRect(((x / 2) | 0) - 151, midY + 1, 302, 32, Colors.BLACK);
        Pix2D.fillRect(((x / 2) | 0) - 150, midY + 2, percent * 3, 30, Colors.PROGRESS_RED);
        Pix2D.fillRect(((x / 2) | 0) - 150 + percent * 3, midY + 2, 300 - percent * 3, 30, Colors.BLACK);
        this.fontBold12?.centreString((x / 2) | 0, ((y / 2) | 0) + 5 - offsetY, message, Colors.WHITE);

        this.imageTitle4?.draw(202, 171);

        if (this.redrawFrame) {
            this.redrawFrame = false;

            if (!this.flameActive) {
                this.imageTitle0?.draw(0, 0);
                this.imageTitle1?.draw(637, 0);
            }

            this.imageTitle2?.draw(128, 0);
            this.imageTitle3?.draw(202, 371);
            this.imageTitle5?.draw(0, 265);
            this.imageTitle6?.draw(562, 265);
            this.imageTitle7?.draw(128, 171);
            this.imageTitle8?.draw(562, 171);
        }

        await sleep(5); // return a slice of time to the main loop so it can update the progress bar
    }

    private drawError(): void {
        canvas2d.fillStyle = 'black';
        canvas2d.fillRect(0, 0, this.width, this.height);

        this.setFramerate(1);

        this.flameActive = false;
        let y: number = 0;

        if (this.errorLoading) {
            canvas2d.font = 'bold 16px helvetica, sans-serif';
            canvas2d.textAlign = 'left';
            canvas2d.fillStyle = 'yellow';
            y = 35;
            canvas2d.fillText('Sorry, an error has occured whilst loading RuneScape', 30, y);

            y += 50;
            canvas2d.fillStyle = 'white';
            canvas2d.fillText('To fix this try the following (in order):', 30, y);

            y += 50;
            canvas2d.font = 'bold 12px helvetica, sans-serif';
            canvas2d.fillText('1: Try closing ALL open web-browser windows, and reloading', 30, y);

            y += 30;
            canvas2d.fillText('2: Try clearing your web-browsers cache', 30, y); // "2: Try clearing your web-browsers cache from tools->internet options"

            y += 30;
            canvas2d.fillText('3: Try using a different game-world', 30, y);

            y += 30;
            canvas2d.fillText('4: Try rebooting your computer', 30, y);

            y += 30;
            canvas2d.fillText('5: Try selecting a different method from the play-game menu', 30, y); // "5: Try selecting a different version of Java from the play-game menu"
        } else if (this.errorHost) {
            canvas2d.font = 'bold 20px helvetica, sans-serif';
            canvas2d.textAlign = 'left';
            canvas2d.fillStyle = 'white';

            y = 50;
            canvas2d.fillText('Error - unable to load game!', 50, y);

            y += 50;
            canvas2d.fillText('To play RuneScape make sure you play from', 50, y);

            y += 50;
            canvas2d.fillText('An approved domain', 50, y); // "http://www.runescape.com"
        } else if (this.errorStarted) {
            canvas2d.font = 'bold 13px helvetica, sans-serif';
            canvas2d.textAlign = 'left';
            canvas2d.fillStyle = 'yellow';

            y = 35;
            canvas2d.fillText('Error a copy of RuneScape already appears to be loaded', 30, y);

            y += 50;
            canvas2d.fillStyle = 'white';
            canvas2d.fillText('To fix this try the following (in order):', 30, y);

            y += 50;
            canvas2d.font = 'bold 12px helvetica, sans-serif';
            canvas2d.fillText('1: Try closing ALL open web-browser windows, and reloading', 30, y);

            y += 30;
            canvas2d.fillText('2: Try rebooting your computer, and reloading', 30, y);
        }

        if (this.errorMessage) {
            y += 50;
            canvas2d.fillStyle = 'red';
            canvas2d.fillText(this.errorMessage, 30, y);
        }
    }

    private async getJagFile(filename: string, displayName: string, index: number, progress: number): Promise<Jagfile> {
        const crc = this.jagChecksum[index];

        let data: Uint8Array | undefined;
        let retry: number = 5;

        try {
            if (this.db) {
                data = await this.db.read(0, index);
            }
        } catch (err) {
        }

        if (data && Packet.getcrc(data, 0, data.length) !== crc) {
            data = undefined;
        }

        if (data) {
            return new Jagfile(data);
        }

        let loops = 0;
        while (!data) {
            await this.drawProgress(progress, `Requesting ${displayName}`);

            try {
                data = await downloadUrl(`/${filename}${crc}`);

                const checksum = Packet.getcrc(data, 0, data.length);
                if (crc === checksum) {
                    try {
                        if (this.db) {
                            await this.db.write(0, index, data);
                        }
                    } catch (e) {
                    }
                } else {
                    data = undefined;
                    loops++;
                }
            } catch (e) {
                data = undefined;
            }

            if (!data) {
                for (let i: number = retry; i > 0; i--) {
                    if (loops >= 3) {
                        await this.drawProgress(progress, 'Game updated - please reload page');
                        i = 10;
                    } else {
                        await this.drawProgress(progress, `Error loading - Will retry in ${i} secs.`);
                    }

                    await sleep(1000);
                }

                retry *= 2;
                if (retry > 60) {
                    retry = 60;
                }
            }
        }

        return new Jagfile(data);
    }

    async onDemandLoop() {
        if (!this.onDemand) {
            return;
        }

        await this.onDemand.run();

        while (true) {
            const req = this.onDemand.loop();
            if (req === null) {
                return;
            }

            if (!req.data) {
                continue;
            }

            if (req.archive === 0) {
                Model.unpack(req.file, req.data);

                if ((this.onDemand.getModelFlags(req.file) & 0x62) != 0) {
                    this.redrawSidebar = true;

                    if (this.chatLayerId !== -1) {
                        this.redrawChatback = true;
                    }
                }
            } else if (req.archive === 1) {
                AnimFrame.unpack(req.data);
            } else if (req.archive === 2) {
                if (this.midiSong === req.file) {
                    this.saveMidi(this.midiFading, req.data);
                }
            } else if (req.archive === 3) {
                if (this.mapBuildGroundData && this.mapBuildLocationData && this.sceneState === 1) {
                    for (let i = 0; i < this.mapBuildGroundData.length; i++) {
                        if (this.mapBuildGroundFile[i] == req.file) {
                            this.mapBuildGroundData[i] = req.data;

                            if (req.data == null) {
                                this.mapBuildGroundFile[i] = -1;
                            }

                            break;
                        }

                        if (this.mapBuildLocationFile[i] == req.file) {
                            this.mapBuildLocationData[i] = req.data;

                            if (req.data == null) {
                                this.mapBuildLocationFile[i] = -1;
                            }

                            break;
                        }
                    }
                }
            } else if (req.archive === 93) {
                if (this.onDemand.hasMapLocFile(req.file)) {
                    ClientBuild.prefetchLocations(new Packet(req.data), this.onDemand);
                }
            }
        }
    }

    // jag::oldscape::TitleScreen::Loop
    private async titleScreenLoop(): Promise<void> {
        if (this.loginscreen === 0) {
            let x: number = ((this.width / 2) | 0) - 80;
            let y: number = ((this.height / 2) | 0) + 20;

            y += 20;
            if (this.mouseClickButton === 1 && this.mouseClickX >= x - 75 && this.mouseClickX <= x + 75 && this.mouseClickY >= y - 20 && this.mouseClickY <= y + 20) {
                this.loginscreen = 3;
                this.loginSelect = 0;
            }

            x = ((this.width / 2) | 0) + 80;
            if (this.mouseClickButton === 1 && this.mouseClickX >= x - 75 && this.mouseClickX <= x + 75 && this.mouseClickY >= y - 20 && this.mouseClickY <= y + 20) {
                this.loginMes1 = '';
                this.loginMes2 = 'Enter your username & password.';
                this.loginscreen = 2;
                this.loginSelect = 0;
            }
        } else if (this.loginscreen === 2) {
            let y: number = ((this.height / 2) | 0) - 40;
            y += 30;

            y += 25;
            if (this.mouseClickButton === 1 && this.mouseClickY >= y - 15 && this.mouseClickY < y) {
                this.loginSelect = 0;
            }

            y += 15;
            if (this.mouseClickButton === 1 && this.mouseClickY >= y - 15 && this.mouseClickY < y) {
                this.loginSelect = 1;
            }
            // y += 15; dead code

            let x = ((this.width / 2) | 0) - 80;
            y = ((this.height / 2) | 0) + 50;
            y += 20;

            if (this.mouseClickButton === 1 && this.mouseClickX >= x - 75 && this.mouseClickX <= x + 75 && this.mouseClickY >= y - 20 && this.mouseClickY <= y + 20) {
                await this.login(this.loginUser, this.loginPass, false);

                if (this.ingame) {
                    return;
                }
            }

            x = ((this.width / 2) | 0) + 80;
            if (this.mouseClickButton === 1 && this.mouseClickX >= x - 75 && this.mouseClickX <= x + 75 && this.mouseClickY >= y - 20 && this.mouseClickY <= y + 20) {
                this.loginscreen = 0;
                this.loginUser = '';
                this.loginPass = '';
            }

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const key: number = this.pollKey();
                if (key === -1) {
                    return;
                }

                let valid: boolean = false;
                for (let i: number = 0; i < PixFont.CHARSET.length; i++) {
                    if (String.fromCharCode(key) === PixFont.CHARSET.charAt(i)) {
                        valid = true;
                        break;
                    }
                }

                if (this.loginSelect === 0) {
                    if (key === 8 && this.loginUser.length > 0) {
                        this.loginUser = this.loginUser.substring(0, this.loginUser.length - 1);
                    }

                    if (key === 9 || key === 10 || key === 13) {
                        this.loginSelect = 1;
                    }

                    if (valid) {
                        this.loginUser = this.loginUser + String.fromCharCode(key);
                    }

                    if (this.loginUser.length > 12) {
                        this.loginUser = this.loginUser.substring(0, 12);
                    }
                } else if (this.loginSelect === 1) {
                    if (key === 8 && this.loginPass.length > 0) {
                        this.loginPass = this.loginPass.substring(0, this.loginPass.length - 1);
                    }

                    if (key === 9 || key === 10 || key === 13) {
                        this.loginSelect = 0;
                    }

                    if (valid) {
                        this.loginPass = this.loginPass + String.fromCharCode(key);
                    }

                    if (this.loginPass.length > 20) {
                        this.loginPass = this.loginPass.substring(0, 20);
                    }
                }
            }
        } else if (this.loginscreen === 3) {
            const x: number = (this.width / 2) | 0;
            let y: number = ((this.height / 2) | 0) + 50;

            y += 20;
            if (this.mouseClickButton === 1 && this.mouseClickX >= x - 75 && this.mouseClickX <= x + 75 && this.mouseClickY >= y - 20 && this.mouseClickY <= y + 20) {
                this.loginscreen = 0;
            }
        }
    }

    // jag::oldscape::Client::LoginPoll
    private async login(username: string, password: string, reconnect: boolean): Promise<void> {
        try {
            if (!reconnect) {
                this.loginMes1 = '';
                this.loginMes2 = 'Connecting to server...';
                await this.titleScreenDraw();
            }

            this.stream = new ClientStream(await ClientStream.openSocket(window.location.host, window.location.protocol === 'https:'));

            const username37 = JString.toBase37(username);
            const loginServer = Number(username37 >> 16n) & 0x1F;

            this.out.pos = 0;
            this.out.p1(14);
            this.out.p1(loginServer);

            this.stream.write(this.out.data, 2);
            for (let i = 0; i < 8; i++) {
                await this.stream.read();
            }

            let reply: number = await this.stream.read();
            if (reply === 0) {
                await this.stream.readBytes(this.in.data, 0, 8);
                this.in.pos = 0;

                this.serverSeed = this.in.g8();
                const seed: Int32Array = new Int32Array([Math.floor(Math.random() * 99999999), Math.floor(Math.random() * 99999999), Number(this.serverSeed >> 32n), Number(this.serverSeed & BigInt(0xffffffff))]);

                this.out.pos = 0;
                this.out.p1(10);
                this.out.p4(seed[0]);
                this.out.p4(seed[1]);
                this.out.p4(seed[2]);
                this.out.p4(seed[3]);
                this.out.p4(1337); // uid
                this.out.pjstr(username);
                this.out.pjstr(password);
                this.out.rsaenc(BigInt(process.env.LOGIN_RSAN!), BigInt(process.env.LOGIN_RSAE!));

                this.loginout.pos = 0;
                if (reconnect) {
                    this.loginout.p1(18);
                } else {
                    this.loginout.p1(16);
                }

                this.loginout.p1(this.out.pos + 36 + 1 + 1);
                this.loginout.p1(Constants.CLIENT_VERSION);
                this.loginout.p1(Client.lowMem ? 1 : 0);

                for (let i: number = 0; i < 9; i++) {
                    this.loginout.p4(this.jagChecksum[i]);
                }

                this.loginout.pdata(this.out.data, this.out.pos, 0);
                this.out.random = new Isaac(seed);
                for (let i: number = 0; i < 4; i++) {
                    seed[i] += 50;
                }
                this.randomIn = new Isaac(seed);
                this.stream?.write(this.loginout.data, this.loginout.pos);

                reply = await this.stream.read();
            }

            if (reply === 1) {
                await sleep(2000);
                await this.login(username, password, reconnect);
            } else if (reply === 2) {
                this.staffmodlevel = await this.stream.read();
                this.mouseTracked = await this.stream.read() === 1;

                InputTracking.deactivate();
                this.prevMouseClickTime = 0;
                this.mouseTrackedDelta = 0;
                this.mouseTracking.length = 0;
                this.hasFocus = true;
                this.focused = true;
                this.ingame = true;
                this.out.pos = 0;
                this.in.pos = 0;
                this.ptype = -1;
                this.ptype0 = -1;
                this.ptype1 = -1;
                this.ptype2 = -1;
                this.psize = 0;
                this.packetCycle = performance.now();
                this.systemUpdateTimer = 0;
                this.pendingLogout = 0;
                this.hintType = 0;
                this.menuSize = 0;
                this.menuVisible = false;
                this.idleCycle = performance.now();

                for (let i: number = 0; i < 100; i++) {
                    this.messageText[i] = null;
                }

                this.objSelected = 0;
                this.spellSelected = 0;
                this.sceneState = 0;
                this.waveCount = 0;

                this.macroCameraX = ((Math.random() * 100.0) | 0) - 50;
                this.macroCameraZ = ((Math.random() * 110.0) | 0) - 55;
                this.macroCameraAngle = ((Math.random() * 80.0) | 0) - 40;
                this.macroMinimapAngle = ((Math.random() * 120.0) | 0) - 60;
                this.macroMinimapZoom = ((Math.random() * 30.0) | 0) - 20;
                this.orbitCameraYaw = (((Math.random() * 20.0) | 0) - 10) & 0x7ff;

                this.minimapLevel = -1;
                this.flagTileX = 0;
                this.flagTileZ = 0;

                this.playerCount = 0;
                this.npcCount = 0;

                for (let i: number = 0; i < Constants.MAX_PLAYER_COUNT; i++) {
                    this.players[i] = null;
                    this.playerAppearanceBuffer[i] = null;
                }

                for (let i: number = 0; i < 16384; i++) {
                    this.npc[i] = null;
                }

                this.localPlayer = this.players[Constants.LOCAL_PLAYER_INDEX] = new ClientPlayer();

                this.projectiles.clear();
                this.spotanims.clear();

                for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
                    for (let x: number = 0; x < CollisionConstants.SIZE; x++) {
                        for (let z: number = 0; z < CollisionConstants.SIZE; z++) {
                            this.objStacks[level][x][z] = null;
                        }
                    }
                }

                this.locChanges = new LinkList();
                this.friendListStatus = 0;
                this.friendCount = 0;
                this.tutLayerId = -1;
                this.chatLayerId = -1;
                this.mainLayerId = -1;
                this.sideLayerId = -1;
                this.mainOverlayLayerId = -1;
                this.pressedContinueOption = false;
                this.sideTab = 3;
                this.chatbackInputOpen = false;
                this.menuVisible = false;
                this.showSocialInput = false;
                this.modalMessage = null;
                this.inMultizone = 0;
                this.flashingTab = -1;

                this.designGender = true;
                this.validateCharacterDesign();
                for (let i: number = 0; i < 5; i++) {
                    this.designColours[i] = 0;
                }

                for (let i = 0; i < 5; i++) {
                    this.playerOp[i] = null;
                    this.playerOpPriority[i] = false;
                }

                Client.oplogic1 = 0;
                Client.oplogic2 = 0;
                Client.oplogic3 = 0;
                Client.oplogic4 = 0;
                Client.oplogic5 = 0;
                Client.oplogic6 = 0;
                Client.oplogic7 = 0;
                Client.oplogic8 = 0;
                Client.oplogic9 = 0;
                Client.oplogic10 = 0;

                this.prepareGame();
            } else if (reply === 3) {
                this.loginMes1 = '';
                this.loginMes2 = 'Invalid username or password.';
            } else if (reply === 4) {
                this.loginMes1 = 'Your account has been disabled.';
                this.loginMes2 = 'Please check your message-centre for details.';
            } else if (reply === 5) {
                this.loginMes1 = 'Your account is already logged in.';
                this.loginMes2 = 'Try again in 60 secs...';
            } else if (reply === 6) {
                this.loginMes1 = 'RuneScape has been updated!';
                this.loginMes2 = 'Please reload this page.';
            } else if (reply === 7) {
                this.loginMes1 = 'This world is full.';
                this.loginMes2 = 'Please use a different world.';
            } else if (reply === 8) {
                this.loginMes1 = 'Unable to connect.';
                this.loginMes2 = 'Login server offline.';
            } else if (reply === 9) {
                this.loginMes1 = 'Login limit exceeded.';
                this.loginMes2 = 'Too many connections from your address.';
            } else if (reply === 10) {
                this.loginMes1 = 'Unable to connect.';
                this.loginMes2 = 'Bad session id.';
            } else if (reply === 11) {
                this.loginMes2 = 'Login server rejected session.'; // intentionally loginMessage1
                this.loginMes2 = 'Please try again.';
            } else if (reply === 12) {
                this.loginMes1 = 'You need a members account to login to this world.';
                this.loginMes2 = 'Please subscribe, or use a different world.';
            } else if (reply === 13) {
                this.loginMes1 = 'Could not complete login.';
                this.loginMes2 = 'Please try using a different world.';
            } else if (reply === 14) {
                this.loginMes1 = 'The server is being updated.';
                this.loginMes2 = 'Please wait 1 minute and try again.';
            } else if (reply === 15) {
                this.ingame = true;
                this.out.pos = 0;
                this.in.pos = 0;
                this.ptype = -1;
                this.ptype0 = -1;
                this.ptype1 = -1;
                this.ptype2 = -1;
                this.psize = 0;
                this.packetCycle = performance.now();
                this.systemUpdateTimer = 0;
                this.menuSize = 0;
                this.menuVisible = false;
                this.sceneLoadStartTime = performance.now();
            } else if (reply === 16) {
                this.loginMes1 = 'Login attempts exceeded.';
                this.loginMes2 = 'Please wait 1 minute and try again.';
            } else if (reply === 17) {
                this.loginMes1 = 'You are standing in a members-only area.';
                this.loginMes2 = 'To play on this world move to a free area first';
            } else if (reply === 20) {
                this.loginMes1 = 'Invalid loginserver requested';
                this.loginMes2 = 'Please try using a different world.';
            } else {
                this.loginMes1 = 'Unexpected server response';
                this.loginMes2 = 'Please try using a different world.';
            }
        } catch (err) {
            console.error(err);

            this.loginMes1 = '';
            this.loginMes2 = 'Error connecting to server.';
        }
    }

    // jag::oldscape::Client::Logout
    private async logout(): Promise<void> {
        if (this.stream) {
            this.stream.close();
        }

        this.stream = null;
        this.ingame = false;
        this.loginscreen = 0;
        this.loginUser = '';
        this.loginPass = '';

        InputTracking.deactivate();
        this.clearCaches();
        this.world?.resetMap();

        for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
            this.levelCollisionMap[level]?.reset();
        }

        stopMidi(false);
        this.nextMidiSong = -1;
        this.midiSong = -1;
        this.nextMusicDelay = 0;
    }

    private clearCaches(): void {
        LocType.mc1?.clear();
        LocType.mc2?.clear();
        NpcType.modelCache?.clear();
        ObjType.modelCache?.clear();
        ObjType.spriteCache?.clear();
        ClientPlayer.modelCache?.clear();
        SpotAnimType.modelCache?.clear();
    }

    private prepareGame(): void {
        if (this.areaChatback) {
            return;
        }

        this.unloadTitle();

        this.drawArea = null;
        this.imageTitle2 = null;
        this.imageTitle3 = null;
        this.imageTitle4 = null;
        this.imageTitle0 = null;
        this.imageTitle1 = null;
        this.imageTitle5 = null;
        this.imageTitle6 = null;
        this.imageTitle7 = null;
        this.imageTitle8 = null;

        this.areaChatback = new PixMap(479, 96);

        this.areaMapback = new PixMap(172, 156);
        Pix2D.cls();
        this.mapback?.plotSprite(0, 0);

        this.areaSidebar = new PixMap(190, 261);

        this.areaViewport = new PixMap(512, 334);
        Pix2D.cls();

        this.areaBackbase1 = new PixMap(496, 50);
        this.areaBackbase2 = new PixMap(269, 37);
        this.areaBackhmid1 = new PixMap(249, 45);

        this.redrawFrame = true;
    }

    // jag::oldscape::Client::GameLoop
    private async gameLoop(): Promise<void> {
        if (this.players === null) {
            // client is unloading asynchronously
            return;
        }

        if (this.systemUpdateTimer > 1) {
            this.systemUpdateTimer--;
        }

        if (this.pendingLogout > 0) {
            this.pendingLogout--;
        }

        for (let i: number = 0; i < 5 && (await this.tcpIn()); i++) {
            /* empty */
        }

        const now = performance.now();

        if (this.ingame) {
            if (!this.mouseTracked) {
                this.mouseTracking.length = 0;
            } else if (this.mouseClickButton !== 0 || this.mouseTracking.length >= 40) {
                this.out.pIsaac(ClientProt.EVENT_MOUSE_MOVE);
                this.out.p1(0);
                const start = this.out.pos;
                let count = 0;

                for (let i = 0; i < this.mouseTracking.length; i++) {
                    count++;

                    let y = this.mouseTracking.y[i];
                    if (y < 0) {
                        y = 0;
                    } else if (y > 502) {
                        y = 502;
                    }

                    let x = this.mouseTracking.x[i];
                    if (x < 0) {
                        x = 0;
                    } else if (x > 764) {
                        x = 764;
                    }

                    let pos = y * 765 + x;
                    if (this.mouseTracking.y[i] === -1 && this.mouseTracking.x[i] === -1) {
                        x = -1;
                        y = -1;
                        pos = 0x7FFFF;
                    }

                    if (x !== this.mouseTrackedX || y !== this.mouseTrackedY) {
                        let dx = x - this.mouseTrackedX;
                        this.mouseTrackedX = x;
                        let dy = y - this.mouseTrackedY;
                        this.mouseTrackedY = y;

                        if (this.mouseTrackedDelta < 8 && dx >= -32 && dx <= 31 && dy >= -32 && dy <= 31) {
                            dx += 32;
                            dy += 32;
                            this.out.p2((this.mouseTrackedDelta << 12) + (dx << 6) + dy);
                            this.mouseTrackedDelta = 0;
                        } else if (this.mouseTrackedDelta < 8) {
                            this.out.p3(0x800000 + (this.mouseTrackedDelta << 19) + pos);
                            this.mouseTrackedDelta = 0;
                        } else {
                            this.out.p4(0xC00000 + (this.mouseTrackedDelta << 19) + pos);
                            this.mouseTrackedDelta = 0;
                        }
                    } else if (this.mouseTrackedDelta < 2047) {
                        this.mouseTrackedDelta++;
                    }
                }

                this.out.psize1(this.out.pos - start);

                if (count >= this.mouseTracking.length) {
                    this.mouseTracking.length = 0;
                } else {
                    this.mouseTracking.length -= count;

                    for (let i = 0; i < this.mouseTracking.length; i++) {
                        this.mouseTracking.x[i] = this.mouseTracking.x[i + count];
                        this.mouseTracking.y[i] = this.mouseTracking.y[i + count];
                    }
                }
            }

            if (this.mouseClickButton !== 0) {
                let delta = ((this.mouseClickTime - this.prevMouseClickTime) / 50) | 0;
                if (delta > 4095) {
                    delta = 4095;
                }

                this.prevMouseClickTime = this.mouseClickTime;

                let y = this.mouseClickY;
                if (y < 0) {
                    y = 0;
                } else if (y > 502) {
                    y = 502;
                }

                let x = this.mouseClickX;
                if (x < 0) {
                    x = 0;
                } else if (x > 764) {
                    x = 764;
                }

                const pos = y * 765 + x;

                let button = 0;
                if (this.mouseClickButton === 2) {
                    button = 1;
                }

                this.out.pIsaac(ClientProt.EVENT_MOUSE_CLICK);
                this.out.p4((delta << 20) + (button << 19) + pos);
            }

            if (this.sendCameraDelay > 0) {
                this.sendCameraDelay--;
            }

            if (this.keyHeld[1] === 1 || this.keyHeld[2] === 1 || this.keyHeld[3] === 1 || this.keyHeld[4] === 1) {
                this.sendCamera = true;
            }

            if (this.sendCamera && this.sendCameraDelay <= 0) {
                this.sendCameraDelay = 20;
                this.sendCamera = false;
                this.out.pIsaac(ClientProt.EVENT_CAMERA_POSITION);
                this.out.p2(this.orbitCameraPitch);
                this.out.p2(this.orbitCameraYaw);
            }

            if (this.hasFocus && !this.focused) {
                this.focused = true;
                this.out.pIsaac(ClientProt.EVENT_APPLET_FOCUS);
                this.out.p1(1);
            } else if (!this.hasFocus && this.focused) {
                this.focused = false;
                this.out.pIsaac(ClientProt.EVENT_APPLET_FOCUS);
                this.out.p1(0);
            }

            this.checkMinimap();
            this.locChangeDoQueue();
            await this.soundsDoQueue();

            const tracking: Packet | null = InputTracking.flush();
            if (tracking) {
                this.out.pIsaac(ClientProt.EVENT_TRACKING);
                this.out.p2(tracking.pos);
                this.out.pdata(tracking.data, tracking.pos, 0);
                tracking.release();
            }

            if (now - this.packetCycle > 5_000) {
                // no packets received in 5s, connection lost
                await this.tryReconnect();
            }

            this.movePlayers();
            this.moveNpcs();
            this.timeoutChat();

            this.sceneDelta++;

            if (this.crossMode !== 0) {
                this.crossCycle += 20;

                if (this.crossCycle >= 400) {
                    this.crossMode = 0;
                }
            }

            if (this.selectedArea !== 0) {
                this.selectedCycle++;

                if (this.selectedCycle >= 15) {
                    if (this.selectedArea === 2) {
                        this.redrawSidebar = true;
                    } else if (this.selectedArea === 3) {
                        this.redrawChatback = true;
                    }

                    this.selectedArea = 0;
                }
            }

            if (this.objDragArea !== 0) {
                this.objDragCycles++;

                if (this.mouseX > this.objGrabX + 5 || this.mouseX < this.objGrabX - 5 || this.mouseY > this.objGrabY + 5 || this.mouseY < this.objGrabY - 5) {
                    this.objGrabThreshold = true;
                }

                if (this.mouseButton === 0) {
                    if (this.objDragArea === 2) {
                        this.redrawSidebar = true;
                    } else if (this.objDragArea === 3) {
                        this.redrawChatback = true;
                    }

                    this.objDragArea = 0;

                    if (this.objGrabThreshold && this.objDragCycles >= 5) {
                        this.hoveredSlotParentId = -1;
                        this.handleInput();

                        if (this.hoveredSlotParentId === this.objDragLayerId && this.hoveredSlot !== this.objDragSlot) {
                            const com: IfType = IfType.list[this.objDragLayerId];

                            let mode = 0;
                            if (this.bankArrangeMode == 1 && com.clientCode == ClientCode.CC_BANKMODE) {
                                mode = 1;
                            }
                            if (com.linkObjType && com.linkObjType[this.hoveredSlot] <= 0) {
                                mode = 0;
                            }

                            if (com.swappable && com.linkObjType && com.linkObjCount) {
                                const src = this.objDragSlot;
                                const dst = this.hoveredSlot;

                                com.linkObjType[dst] = com.linkObjType[src];
                                com.linkObjCount[dst] = com.linkObjCount[src];
                                com.linkObjType[src] = -1;
                                com.linkObjCount[src] = 0;
                            } else if (mode == 1) {
                                let src = this.objDragSlot;
                                let dst = this.hoveredSlot;

                                while (src != dst) {
                                    if (src > dst) {
                                        com.swapObj(src, src - 1);
                                        src--;
                                    } else if (src < dst) {
                                        com.swapObj(src, src + 1);
                                        src++;
                                    }
                                }
                            } else {
                                com.swapObj(this.objDragSlot, this.hoveredSlot);
                            }

                            this.out.pIsaac(ClientProt.INV_BUTTOND);
                            this.out.p2(this.objDragLayerId);
                            this.out.p2(this.objDragSlot);
                            this.out.p2(this.hoveredSlot);
                            this.out.p1(mode);
                        }
                    } else if ((this.oneMouseButton === 1 || this.isAddFriendOption(this.menuSize - 1)) && this.menuSize > 2) {
                        this.showContextMenu();
                    } else if (this.menuSize > 0) {
                        this.useMenuOption(this.menuSize - 1);
                    }

                    this.selectedCycle = 10;
                    this.mouseClickButton = 0;
                }
            }

            Client.cyclelogic7++;
            if (Client.cyclelogic7 > 62) {
                Client.cyclelogic7 = 0;

                this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC7);
            }

            if (World.groundX !== -1) {
                if (this.localPlayer) {
                    const x: number = World.groundX;
                    const z: number = World.groundZ;
                    const success: boolean = this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], x, z, 0, 0, 0, 0, 0, 0, true);
                    World.groundX = -1;

                    if (success) {
                        this.crossX = this.mouseClickX;
                        this.crossY = this.mouseClickY;
                        this.crossMode = 1;
                        this.crossCycle = 0;
                    }
                }
            }

            if (this.mouseClickButton === 1 && this.modalMessage) {
                this.modalMessage = null;
                this.redrawChatback = true;
                this.mouseClickButton = 0;
            }

            const checkClickInput = !this.isMobile || (this.isMobile && !MobileKeyboard.isWithinCanvasKeyboard(this.mouseClickX, this.mouseClickY));

            if (checkClickInput) {
                this.handleMouseInput();
                this.handleMinimapInput();
                this.handleTabInput();
                this.handleChatModeInput();
            }

            if (this.mouseButton === 1 || this.mouseClickButton === 1) {
                this.dragCycles++;
            }

            if (this.sceneState === 2) {
                this.followCamera();
            }

            if (this.sceneState === 2 && this.cinemaCam) {
                this.cinemaCamera();
            }

            for (let i: number = 0; i < 5; i++) {
                this.camShakeCycle[i]++;
            }

            await this.handleInputKey();

            if (now - this.idleCycle > 90_000) {
                // no input in 90s, notify the server
                this.pendingLogout = 250;
                this.idleCycle += 10_000; // 10s backoff

                this.out.pIsaac(ClientProt.IDLE_TIMER);
            }

            this.macroCameraCycle++;
            if (this.macroCameraCycle > 500) {
                this.macroCameraCycle = 0;

                const rand: number = (Math.random() * 8.0) | 0;
                if ((rand & 0x1) === 1) {
                    this.macroCameraX += this.macroCameraXModifier;
                }
                if ((rand & 0x2) === 2) {
                    this.macroCameraZ += this.macroCameraZModifier;
                }
                if ((rand & 0x4) === 4) {
                    this.macroCameraAngle += this.macroCameraAngleModifier;
                }
            }

            if (this.macroCameraX < -50) {
                this.macroCameraXModifier = 2;
            } else if (this.macroCameraX > 50) {
                this.macroCameraXModifier = -2;
            }

            if (this.macroCameraZ < -55) {
                this.macroCameraZModifier = 2;
            } else if (this.macroCameraZ > 55) {
                this.macroCameraZModifier = -2;
            }

            if (this.macroCameraAngle < -40) {
                this.macroCameraAngleModifier = 1;
            } else if (this.macroCameraAngle > 40) {
                this.macroCameraAngleModifier = -1;
            }

            this.macroMinimapCycle++;
            if (this.macroMinimapCycle > 500) {
                this.macroMinimapCycle = 0;

                const rand: number = (Math.random() * 8.0) | 0;
                if ((rand & 0x1) === 1) {
                    this.macroMinimapAngle += this.macroMinimapAngleModifier;
                }
                if ((rand & 0x2) === 2) {
                    this.macroMinimapZoom += this.macroMinimapZoomModifier;
                }
            }

            if (this.macroMinimapAngle < -60) {
                this.macroMinimapAngleModifier = 2;
            } else if (this.macroMinimapAngle > 60) {
                this.macroMinimapAngleModifier = -2;
            }

            if (this.macroMinimapZoom < -20) {
                this.macroMinimapZoomModifier = 1;
            } else if (this.macroMinimapZoom > 10) {
                this.macroMinimapZoomModifier = -1;
            }

            if (now - this.noTimeoutCycle > 1_000) {
                // nothing sent in the last 1s, keep the client connected
                this.out.pIsaac(ClientProt.NO_TIMEOUT);
            }

            try {
                if (this.stream && this.out.pos > 0) {
                    this.stream.write(this.out.data, this.out.pos);
                    this.out.pos = 0;
                    this.noTimeoutCycle = now;
                }
            } catch (e) {
                console.error(e);

                // todo: reconnect on IO error, logout on any other error
                await this.tryReconnect();
            }
        }
    }

    private async tryReconnect() {
        if (this.pendingLogout > 0) {
            await this.logout();
            return;
        }

        this.areaViewport?.bind();
        this.fontPlain12?.centreString(257, 144, 'Connection lost', Colors.BLACK);
        this.fontPlain12?.centreString(256, 143, 'Connection lost', Colors.WHITE);
        this.fontPlain12?.centreString(257, 159, 'Please wait - attempting to reestablish', Colors.BLACK);
        this.fontPlain12?.centreString(256, 158, 'Please wait - attempting to reestablish', Colors.WHITE);
        this.areaViewport?.draw(4, 4);

        this.flagTileX = 0;

        this.stream?.close();

        this.ingame = false;
        await this.login(this.loginUser, this.loginPass, true);
        if (!this.ingame) {
            await this.logout();
        }
    }

    // jag::oldscape::Client::GlCheckMinimap
    private checkMinimap(): void {
        if (Client.lowMem && this.sceneState === 2 && ClientBuild.minusedlevel !== this.minusedlevel) {
            this.areaViewport?.bind();
            this.fontPlain12?.centreString(257, 151, 'Loading - please wait.', Colors.BLACK);
            this.fontPlain12?.centreString(256, 150, 'Loading - please wait.', Colors.WHITE);
            this.areaViewport?.draw(4, 4);
            this.sceneState = 1;
            this.sceneLoadStartTime = performance.now();
        }

        if (this.sceneState === 1) {
            const status = this.checkScene();
            if (status != 0 && performance.now() - this.sceneLoadStartTime > 360000) {
                console.log(`${this.loginUser} glcfb ${this.serverSeed},${status},${Client.lowMem},${this.db !== null},${this.onDemand?.remaining()},${this.minusedlevel},${this.mapBuildCenterZoneX},${this.mapBuildCenterZoneZ}`);
                this.sceneLoadStartTime = performance.now();
            }
        }

        if (this.sceneState === 2 && this.minusedlevel !== this.minimapLevel) {
            this.minimapLevel = this.minusedlevel;
            this.minimapBuildBuffer(this.minusedlevel);
        }
    }

    private checkScene(): number {
        if (!this.mapBuildIndex || !this.mapBuildGroundData || !this.mapBuildLocationData) {
            return -1000; // custom
        }

        for (let i = 0; i < this.mapBuildGroundData.length; i++) {
            if (this.mapBuildGroundData[i] == null && this.mapBuildGroundFile[i] !== -1) {
                return -1;
            }

            if (this.mapBuildLocationData[i] == null && this.mapBuildLocationFile[i] !== -1) {
                return -2;
            }
        }

        let ready = true;
        for (let i = 0; i < this.mapBuildGroundData.length; i++) {
            const data = this.mapBuildLocationData[i];
            if (data != null) {
                const x = (this.mapBuildIndex[i] >> 8) * 64 - this.mapBuildBaseX;
                const z = (this.mapBuildIndex[i] & 0xFF) * 64 - this.mapBuildBaseZ;
                if (!ClientBuild.checkLocations(data, x, z)) {
                    ready = false;
                }
            }
        }

        if (!ready) {
            return -3;
        } else if (this.awaitingPlayerInfo) {
            return -4;
        }

        this.sceneState = 2;
        ClientBuild.minusedlevel = this.minusedlevel;
        this.mapBuild();
        this.out.pIsaac(ClientProt.MAP_BUILD_COMPLETE);
        return 0;
    }

    // jag::oldscape::Client::MapBuildLoop
    private mapBuild(): void {
        try {
            this.minimapLevel = -1;
            this.spotanims.clear();
            this.projectiles.clear();
            Pix3D.clearTexels();
            this.clearCaches();
            this.world?.resetMap();

            for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
                this.levelCollisionMap[level]?.reset();
            }

            const build: ClientBuild = new ClientBuild(CollisionConstants.SIZE, CollisionConstants.SIZE, this.groundh!, this.mapl!);
            ClientBuild.lowMem = World.lowMem;

            const maps: number = this.mapBuildGroundData?.length ?? 0;

            if (this.mapBuildIndex) {
                for (let index: number = 0; index < maps; index++) {
                    const x: number = this.mapBuildIndex[index] >> 8;
                    const z: number = this.mapBuildIndex[index] & 0xff;

                    // underground pass check
                    if (x === 33 && z >= 71 && z <= 73) {
                        ClientBuild.lowMem = false;
                        break;
                    }
                }
            }

            if (Client.lowMem) {
                this.world?.fillBaseLevel(this.minusedlevel);
            } else {
                this.world?.fillBaseLevel(0);
            }

            if (this.mapBuildIndex && this.mapBuildGroundData) {
                this.out.pIsaac(ClientProt.NO_TIMEOUT);

                for (let i: number = 0; i < maps; i++) {
                    const x: number = (this.mapBuildIndex[i] >> 8) * 64 - this.mapBuildBaseX;
                    const z: number = (this.mapBuildIndex[i] & 0xff) * 64 - this.mapBuildBaseZ;
                    const data: Uint8Array | null = this.mapBuildGroundData[i];

                    if (data) {
                        build.loadGround((this.mapBuildCenterZoneX - 6) * 8, (this.mapBuildCenterZoneZ - 6) * 8, x, z, data);
                    }
                }

                for (let i: number = 0; i < maps; i++) {
                    const x: number = (this.mapBuildIndex[i] >> 8) * 64 - this.mapBuildBaseX;
                    const z: number = (this.mapBuildIndex[i] & 0xff) * 64 - this.mapBuildBaseZ;
                    const data: Uint8Array | null = this.mapBuildGroundData[i];

                    if (!data && this.mapBuildCenterZoneZ < 800) {
                        build.fadeAdjacent(z, x, 64, 64);
                    }
                }
            }

            if (this.mapBuildIndex && this.mapBuildLocationData) {
                this.out.pIsaac(ClientProt.NO_TIMEOUT);

                for (let i: number = 0; i < maps; i++) {
                    const data: Uint8Array | null = this.mapBuildLocationData[i];

                    if (data) {
                        const x: number = (this.mapBuildIndex[i] >> 8) * 64 - this.mapBuildBaseX;
                        const z: number = (this.mapBuildIndex[i] & 0xff) * 64 - this.mapBuildBaseZ;
                        build.loadLocations(this.loopCycle, this.world, this.levelCollisionMap, data, x, z);
                    }
                }
            }

            this.out.pIsaac(ClientProt.NO_TIMEOUT);

            build.finishBuild(this.world, this.levelCollisionMap);
            this.areaViewport?.bind();

            this.out.pIsaac(ClientProt.NO_TIMEOUT);

            for (let x: number = 0; x < CollisionConstants.SIZE; x++) {
                for (let z: number = 0; z < CollisionConstants.SIZE; z++) {
                    this.showObject(x, z);
                }
            }

            this.locChangePostBuildCorrect();
        } catch (err) {
            console.error(err);
        }

        LocType.mc1?.clear();

        if (Client.lowMem && this.db) {
            const modelCount = this.onDemand?.getFileCount(0) ?? 0;

            for (let i = 0; i < modelCount; i++) {
                const flags = this.onDemand?.getModelFlags(i) ?? 0;

                if ((flags & 0x79) == 0) {
                    Model.unload(i);
                }
            }
        }

        Pix3D.initPool(20);
        this.onDemand?.clearPrefetches();

        let left = (this.mapBuildCenterZoneX - 6) / 8 - 1;
        let right = (this.mapBuildCenterZoneX + 6) / 8 + 1;
        let bottom = (this.mapBuildCenterZoneZ - 6) / 8 - 1;
        let top = (this.mapBuildCenterZoneZ + 6) / 8 + 1;

        if (this.withinTutorialIsland) {
            left = 49;
            right = 50;
            bottom = 49;
            top = 50;
        }

        for (let x = left; x <= right; x++) {
            for (let z = bottom; z <= top; z++) {
                if (left == x || right == x || bottom == z || top == z) {
                    const land = this.onDemand?.getMapFile(z, x, 0) ?? -1;
                    if (land != -1) {
                        this.onDemand?.prefetch(3, land);
                    }

                    const loc = this.onDemand?.getMapFile(z, x, 1) ?? -1;
                    if (loc != -1) {
                        this.onDemand?.prefetch(3, loc);
                    }
                }
            }
        }
    }

    // jag::oldscape::Client::LocChangePostBuildCorrect
    private locChangePostBuildCorrect(): void {
        for (let loc: LocChange | null = this.locChanges.head() as LocChange | null; loc; loc = this.locChanges.next() as LocChange | null) {
            if (loc.endTime === -1) {
                loc.startTime = 0;
                this.locChangeSetOld(loc);
            } else {
                loc.unlink();
            }
        }
    }

    // jag::oldscape::minimap::Minimap::BuildBuffer
    private minimapBuildBuffer(level: number): void {
        if (!this.minimap) {
            return;
        }

        const pixels: Int32Array = this.minimap.data;
        const length: number = pixels.length;
        for (let i: number = 0; i < length; i++) {
            pixels[i] = 0;
        }

        for (let z: number = 1; z < CollisionConstants.SIZE - 1; z++) {
            let offset: number = (CollisionConstants.SIZE - 1 - z) * 512 * 4 + 24628;

            for (let x: number = 1; x < CollisionConstants.SIZE - 1; x++) {
                if (this.mapl && (this.mapl[level][x][z] & (MapFlag.VisBelow | MapFlag.ForceHighDetail)) === 0) {
                    this.world?.render2DGround(level, x, z, pixels, offset, 512);
                }

                if (level < 3 && this.mapl && (this.mapl[level + 1][x][z] & MapFlag.VisBelow) !== 0) {
                    this.world?.render2DGround(level + 1, x, z, pixels, offset, 512);
                }

                offset += 4;
            }
        }

        const inactiveRgb: number = ((((Math.random() * 20.0) | 0) + 238 - 10) << 16) + ((((Math.random() * 20.0) | 0) + 238 - 10) << 8) + ((Math.random() * 20.0) | 0) + 238 - 10;
        const activeRgb: number = (((Math.random() * 20.0) | 0) + 238 - 10) << 16;

        this.minimap.setPixels();

        for (let z: number = 1; z < CollisionConstants.SIZE - 1; z++) {
            for (let x: number = 1; x < CollisionConstants.SIZE - 1; x++) {
                if (this.mapl && (this.mapl[level][x][z] & (MapFlag.VisBelow | MapFlag.ForceHighDetail)) === 0) {
                    this.drawDetail(x, z, level, inactiveRgb, activeRgb);
                }

                if (level < 3 && this.mapl && (this.mapl[level + 1][x][z] & MapFlag.VisBelow) !== 0) {
                    this.drawDetail(x, z, level + 1, inactiveRgb, activeRgb);
                }
            }
        }

        this.areaViewport?.bind();

        this.activeMapFunctionCount = 0;

        for (let x: number = 0; x < CollisionConstants.SIZE; x++) {
            for (let z: number = 0; z < CollisionConstants.SIZE; z++) {
                let typecode: number = this.world?.gdType(this.minusedlevel, x, z) ?? 0;
                if (typecode === 0) {
                    continue;
                }

                const locId = (typecode >> 14) & 0x7fff;
                const func: number = LocType.get(locId).mapfunction;
                if (func < 0) {
                    continue;
                }

                let stx: number = x;
                let stz: number = z;

                if (func !== 22 && func !== 29 && func !== 34 && func !== 36 && func !== 46 && func !== 47 && func !== 48) {
                    const maxX: number = CollisionConstants.SIZE;
                    const maxZ: number = CollisionConstants.SIZE;
                    const collisionmap: CollisionMap | null = this.levelCollisionMap[this.minusedlevel];

                    if (collisionmap) {
                        const flags: Int32Array = collisionmap.flags;

                        for (let i: number = 0; i < 10; i++) {
                            const rand: number = (Math.random() * 4.0) | 0;
                            if (rand === 0 && stx > 0 && stx > x - 3 && (flags[CollisionMap.index(stx - 1, stz)] & CollisionFlag.BLOCK_WEST) === CollisionFlag.OPEN) {
                                stx--;
                            }

                            if (rand === 1 && stx < maxX - 1 && stx < x + 3 && (flags[CollisionMap.index(stx + 1, stz)] & CollisionFlag.BLOCK_EAST) === CollisionFlag.OPEN) {
                                stx++;
                            }

                            if (rand === 2 && stz > 0 && stz > z - 3 && (flags[CollisionMap.index(stx, stz - 1)] & CollisionFlag.BLOCK_SOUTH) === CollisionFlag.OPEN) {
                                stz--;
                            }

                            if (rand === 3 && stz < maxZ - 1 && stz < z + 3 && (flags[CollisionMap.index(stx, stz + 1)] & CollisionFlag.BLOCK_NORTH) === CollisionFlag.OPEN) {
                                stz++;
                            }
                        }
                    }
                }

                this.activeMapFunctions[this.activeMapFunctionCount] = this.mapfunction[func];
                this.activeMapFunctionX[this.activeMapFunctionCount] = stx;
                this.activeMapFunctionZ[this.activeMapFunctionCount] = stz;
                this.activeMapFunctionCount++;
            }
        }

        Client.cyclelogic3++;
        if (Client.cyclelogic3 > 112) {
            Client.cyclelogic3 = 0;

            this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC3);
            this.out.p1(50);
        }
    }

    // jag::oldscape::Client::LocChangeDoQueue
    private locChangeDoQueue(): void {
        if (this.sceneState !== 2) {
            return;
        }

        for (let loc: LocChange | null = this.locChanges.head() as LocChange | null; loc; loc = this.locChanges.next() as LocChange | null) {
            if (loc.endTime > 0) {
                loc.endTime--;
            }

            if (loc.endTime != 0) {
                if (loc.startTime > 0) {
                    loc.startTime--;
                }

                if (loc.startTime === 0 && loc.x >= 1 && loc.z >= 1 && loc.x <= 102 && loc.z <= 102 && (loc.newType < 0 || ClientBuild.changeLocAvailable(loc.newType, loc.newShape))) {
                    this.locChangeUnchecked(loc.level, loc.x, loc.z, loc.newType, loc.newAngle, loc.newShape, loc.layer);
                    loc.startTime = -1;

                    if (loc.oldType === loc.newType && loc.oldType === -1) {
                        loc.unlink();
                    } else if (loc.oldType === loc.newType && loc.oldAngle === loc.newAngle && loc.oldShape === loc.newShape) {
                        loc.unlink();
                    }
                }
            } else if (loc.oldType < 0 || ClientBuild.changeLocAvailable(loc.oldType, loc.oldShape)) {
                this.locChangeUnchecked(loc.level, loc.x, loc.z, loc.oldType, loc.oldAngle, loc.oldShape, loc.layer);
                loc.unlink();
            }
        }
    }

    // jag::oldscape::Client::GlDoSoundsQueue
    async soundsDoQueue() {
        for (let wave: number = 0; wave < this.waveCount; wave++) {
            if (this.waveDelay[wave] <= 0) {
                try {
                    const buf: Packet | null = Wave.generate(this.waveIds[wave], this.waveLoops[wave]);
                    if (!buf) {
                        throw new Error();
                    }

                    if (performance.now() + ((buf.pos / 22) | 0) > this.lastWaveStartTime + ((this.lastWaveLength / 22) | 0)) {
                        this.lastWaveLength = buf.pos;
                        this.lastWaveStartTime = performance.now();
                        this.lastWaveId = this.waveIds[wave];
                        this.lastWaveLoops = this.waveLoops[wave];
                        await playWave(buf.data.slice(0, buf.pos));
                    }
                } catch (e) {
                }

                this.waveCount--;
                for (let i: number = wave; i < this.waveCount; i++) {
                    this.waveIds[i] = this.waveIds[i + 1];
                    this.waveLoops[i] = this.waveLoops[i + 1];
                    this.waveDelay[i] = this.waveDelay[i + 1];
                }
                wave--;
            } else {
                this.waveDelay[wave]--;
            }
        }

        if (this.nextMusicDelay > 0) {
            this.nextMusicDelay -= 20;

            if (this.nextMusicDelay < 0) {
                this.nextMusicDelay = 0;
            }

            if (this.nextMusicDelay === 0 && this.midiActive && !Client.lowMem) {
                this.midiSong = this.nextMidiSong;
                this.midiFading = false;
                this.onDemand?.request(2, this.midiSong);
            }
        }
    }

    private handleInput(): void {
        if (this.objDragArea !== 0) {
            return;
        }

        this.menuOption[0] = 'Cancel';
        this.menuAction[0] = MenuAction.CANCEL;
        this.menuSize = 1;

        this.handlePrivateChatInput();
        this.lastOverLayerId = 0;

        // the main viewport area
        if (this.mouseX > 4 && this.mouseY > 4 && this.mouseX < 516 && this.mouseY < 338) {
            if (this.mainLayerId === -1) {
                this.handleViewportOptions();
            } else {
                this.handleComponentInput(IfType.list[this.mainLayerId], this.mouseX, this.mouseY, 4, 4, 0);
            }
        }

        if (this.lastOverLayerId !== this.overMainLayerId) {
            this.overMainLayerId = this.lastOverLayerId;
        }

        this.lastOverLayerId = 0;

        // the sidebar/tabs area
        if (this.mouseX > 553 && this.mouseY > 205 && this.mouseX < 743 && this.mouseY < 466) {
            if (this.sideLayerId !== -1) {
                this.handleComponentInput(IfType.list[this.sideLayerId], this.mouseX, this.mouseY, 553, 205, 0);
            } else if (this.sideTabLayerId[this.sideTab] !== -1) {
                this.handleComponentInput(IfType.list[this.sideTabLayerId[this.sideTab]], this.mouseX, this.mouseY, 553, 205, 0);
            }
        }

        if (this.lastOverLayerId !== this.overSideLayerId) {
            this.redrawSidebar = true;
            this.overSideLayerId = this.lastOverLayerId;
        }

        this.lastOverLayerId = 0;

        // the chatbox area
        if (this.mouseX > 17 && this.mouseY > 357 && this.mouseX < 426 && this.mouseY < 453) {
            if (this.chatLayerId !== -1) {
                this.handleComponentInput(IfType.list[this.chatLayerId], this.mouseX, this.mouseY, 17, 357, 0);
            } else if (this.mouseY < 434) {
                this.handleChatMouseInput(this.mouseX - 17, this.mouseY - 357);
            }
        }

        if (this.chatLayerId !== -1 && this.lastOverLayerId !== this.overChatLayerId) {
            this.redrawChatback = true;
            this.overChatLayerId = this.lastOverLayerId;
        }

        let sorted: boolean = false;
        while (!sorted) {
            sorted = true;

            for (let i: number = 0; i < this.menuSize - 1; i++) {
                if (this.menuAction[i] < 1000 && this.menuAction[i + 1] > 1000) {
                    const tmp0: string = this.menuOption[i];
                    this.menuOption[i] = this.menuOption[i + 1];
                    this.menuOption[i + 1] = tmp0;

                    const tmp1: number = this.menuAction[i];
                    this.menuAction[i] = this.menuAction[i + 1];
                    this.menuAction[i + 1] = tmp1;

                    const tmp2: number = this.menuParamB[i];
                    this.menuParamB[i] = this.menuParamB[i + 1];
                    this.menuParamB[i + 1] = tmp2;

                    const tmp3: number = this.menuParamC[i];
                    this.menuParamC[i] = this.menuParamC[i + 1];
                    this.menuParamC[i + 1] = tmp3;

                    const tmp4: number = this.menuParamA[i];
                    this.menuParamA[i] = this.menuParamA[i + 1];
                    this.menuParamA[i + 1] = tmp4;

                    sorted = false;
                }
            }
        }
    }

    private handlePrivateChatInput(): void {
        if (this.splitPrivateChat === 0) {
            return;
        }

        let line: number = 0;
        if (this.systemUpdateTimer !== 0) {
            line = 1;
        }

        for (let i: number = 0; i < 100; i++) {
            if (this.messageText[i] !== null) {
                const type: number = this.messageType[i];
                let sender = this.messageSender[i];

                let mod = false;
                if (sender && sender.startsWith('@cr1@')) {
                    sender = sender.substring(5);
                    mod = true;
                } else if (sender && sender.startsWith('@cr2@')) {
                    sender = sender.substring(5);
                    mod = true;
                }

                if ((type === 3 || type === 7) && (type === 7 || this.chatPrivateMode === 0 || (this.chatPrivateMode === 1 && this.isFriend(sender)))) {
                    const y: number = 329 - line * 13;

                    if (this.mouseX > 4 && this.mouseX < 516 && this.mouseY - 4 > y - 10 && this.mouseY - 4 <= y + 3) {
                        if (this.staffmodlevel) {
                            this.menuOption[this.menuSize] = 'Report abuse @whi@' + sender;
                            this.menuAction[this.menuSize] = MenuAction._PRIORITY + MenuAction.REPORT_ABUSE;
                            this.menuSize++;
                        }

                        this.menuOption[this.menuSize] = 'Add ignore @whi@' + sender;
                        this.menuAction[this.menuSize] = MenuAction._PRIORITY + MenuAction.IGNORELIST_ADD;
                        this.menuSize++;

                        this.menuOption[this.menuSize] = 'Add friend @whi@' + sender;
                        this.menuAction[this.menuSize] = MenuAction._PRIORITY + MenuAction.FRIENDLIST_ADD;
                        this.menuSize++;
                    }

                    line++;
                    if (line >= 5) {
                        return;
                    }
                } else if ((type === 5 || type === 6) && this.chatPrivateMode < 2) {
                    line++;
                    if (line >= 5) {
                        return;
                    }
                }
            }
        }
    }

    private handleChatMouseInput(_mouseX: number, mouseY: number): void {
        let line: number = 0;
        for (let i: number = 0; i < 100; i++) {
            if (!this.messageText[i]) {
                continue;
            }

            const type: number = this.messageType[i];
            const y: number = this.chatScrollOffset + 70 + 4 - line * 14;
            if (y < -20) {
                break;
            }

            let sender = this.messageSender[i];
            let mod = false;
            if (sender && sender.startsWith('@cr1@')) {
                sender = sender.substring(5);
                mod = true;
            } else if (sender && sender.startsWith('@cr2@')) {
                sender = sender.substring(5);
                mod = true;
            }

            if (type === 0) {
                line++;
            } else if ((type == 1 || type == 2) && (type == 1 || this.chatPublicMode == 0 || this.chatPublicMode == 1 && this.isFriend(sender))) {
                if (mouseY > y - 14 && mouseY <= y && this.localPlayer && sender !== this.localPlayer.name) {
                    if (this.staffmodlevel >= 1) {
                        this.menuOption[this.menuSize] = 'Report abuse @whi@' + sender;
                        this.menuAction[this.menuSize] = MenuAction.REPORT_ABUSE;
                        this.menuSize++;
                    }

                    this.menuOption[this.menuSize] = 'Add ignore @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.IGNORELIST_ADD;
                    this.menuSize++;

                    this.menuOption[this.menuSize] = 'Add friend @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.FRIENDLIST_ADD;
                    this.menuSize++;
                }

                line++;
            } else if ((type === 3 || type === 7) && this.splitPrivateChat === 0 && (type === 7 || this.chatPrivateMode === 0 || (this.chatPrivateMode === 1 && this.isFriend(sender)))) {
                if (mouseY > y - 14 && mouseY <= y) {
                    if (this.staffmodlevel >= 1) {
                        this.menuOption[this.menuSize] = 'Report abuse @whi@' + sender;
                        this.menuAction[this.menuSize] = MenuAction.REPORT_ABUSE;
                        this.menuSize++;
                    }

                    this.menuOption[this.menuSize] = 'Add ignore @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.IGNORELIST_ADD;
                    this.menuSize++;

                    this.menuOption[this.menuSize] = 'Add friend @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.FRIENDLIST_ADD;
                    this.menuSize++;
                }

                line++;
            } else if (type === 4 && (this.chatTradeMode === 0 || (this.chatTradeMode === 1 && this.isFriend(sender)))) {
                if (mouseY > y - 14 && mouseY <= y) {
                    this.menuOption[this.menuSize] = 'Accept trade @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.OPPLAYER_TRADEREQ;
                    this.menuSize++;
                }

                line++;
            } else if ((type === 5 || type === 6) && this.splitPrivateChat === 0 && this.chatPrivateMode < 2) {
                line++;
            } else if (type === 8 && (this.chatTradeMode === 0 || (this.chatTradeMode === 1 && this.isFriend(sender)))) {
                if (mouseY > y - 14 && mouseY <= y) {
                    this.menuOption[this.menuSize] = 'Accept duel @whi@' + sender;
                    this.menuAction[this.menuSize] = MenuAction.OPPLAYER_DUELREQ;
                    this.menuSize++;
                }

                line++;
            }
        }
    }

    private handleViewportOptions(): void {
        if (this.objSelected === 0 && this.spellSelected === 0) {
            this.menuOption[this.menuSize] = 'Walk here';
            this.menuAction[this.menuSize] = MenuAction.WALK;
            this.menuParamB[this.menuSize] = this.mouseX;
            this.menuParamC[this.menuSize] = this.mouseY;
            this.menuSize++;
        }

        let lastTypecode: number = -1;
        for (let picked: number = 0; picked < Model.pickedCount; picked++) {
            const typecode: number = Model.pickedBitsets[picked];
            const x: number = typecode & 0x7f;
            const z: number = (typecode >> 7) & 0x7f;
            const entityType: number = (typecode >> 29) & 0x3;
            const typeId: number = (typecode >> 14) & 0x7fff;

            if (typecode === lastTypecode) {
                continue;
            }

            lastTypecode = typecode;

            if (entityType === 2 && this.world && this.world.typecode2(this.minusedlevel, x, z, typecode) >= 0) {
                const loc: LocType = LocType.get(typeId);

                if (this.objSelected === 1) {
                    this.menuOption[this.menuSize] = 'Use ' + this.objSelectedName + ' with @cya@' + loc.name;
                    this.menuAction[this.menuSize] = MenuAction.OPLOCU;
                    this.menuParamA[this.menuSize] = typecode;
                    this.menuParamB[this.menuSize] = x;
                    this.menuParamC[this.menuSize] = z;
                    this.menuSize++;
                } else if (this.spellSelected !== 1) {
                    if (loc.op) {
                        for (let i: number = 4; i >= 0; i--) {
                            if (loc.op[i]) {
                                this.menuOption[this.menuSize] = loc.op[i] + ' @cya@' + loc.name;

                                if (i === 0) {
                                    this.menuAction[this.menuSize] = MenuAction.OPLOC1;
                                } else if (i === 1) {
                                    this.menuAction[this.menuSize] = MenuAction.OPLOC2;
                                } else if (i === 2) {
                                    this.menuAction[this.menuSize] = MenuAction.OPLOC3;
                                } else if (i === 3) {
                                    this.menuAction[this.menuSize] = MenuAction.OPLOC4;
                                } else if (i === 4) {
                                    this.menuAction[this.menuSize] = MenuAction.OPLOC5;
                                }

                                this.menuParamA[this.menuSize] = typecode;
                                this.menuParamB[this.menuSize] = x;
                                this.menuParamC[this.menuSize] = z;
                                this.menuSize++;
                            }
                        }
                    }

                    this.menuOption[this.menuSize] = 'Examine @cya@' + loc.name;
                    this.menuAction[this.menuSize] = MenuAction.OPLOC6;
                    this.menuParamA[this.menuSize] = typecode;
                    this.menuParamB[this.menuSize] = x;
                    this.menuParamC[this.menuSize] = z;
                    this.menuSize++;
                } else if ((this.activeSpellFlags & 0x4) === 4) {
                    this.menuOption[this.menuSize] = this.spellCaption + ' @cya@' + loc.name;
                    this.menuAction[this.menuSize] = MenuAction.OPLOCT;
                    this.menuParamA[this.menuSize] = typecode;
                    this.menuParamB[this.menuSize] = x;
                    this.menuParamC[this.menuSize] = z;
                    this.menuSize++;
                }
            } else if (entityType === 1) {
                const npc: ClientNpc | null = this.npc[typeId];

                if (npc && npc.type && npc.type.size === 1 && (npc.x & 0x7f) === 64 && (npc.z & 0x7f) === 64) {
                    for (let i: number = 0; i < this.npcCount; i++) {
                        const other: ClientNpc | null = this.npc[this.npcIds[i]];

                        if (other && other !== npc && other.type && other.type.size === 1 && other.x === npc.x && other.z === npc.z) {
                            this.addNpcOptions(other.type, this.npcIds[i], x, z);
                        }
                    }
                }

                if (npc && npc.type) {
                    this.addNpcOptions(npc.type, typeId, x, z);
                }
            } else if (entityType === 0) {
                const player: ClientPlayer | null = this.players[typeId];

                if (player && (player.x & 0x7f) === 64 && (player.z & 0x7f) === 64) {
                    for (let i: number = 0; i < this.npcCount; i++) {
                        const other: ClientNpc | null = this.npc[this.npcIds[i]];

                        if (other && other.type && other.type.size === 1 && other.x === player.x && other.z === player.z) {
                            this.addNpcOptions(other.type, this.npcIds[i], x, z);
                        }
                    }

                    for (let i: number = 0; i < this.playerCount; i++) {
                        const other: ClientPlayer | null = this.players[this.playerIds[i]];

                        if (other && other !== player && other.x === player.x && other.z === player.z) {
                            this.addPlayerOptions(other, this.playerIds[i], x, z);
                        }
                    }
                }

                if (player) {
                    this.addPlayerOptions(player, typeId, x, z);
                }
            } else if (entityType === 3) {
                const objs: LinkList | null = this.objStacks[this.minusedlevel][x][z];
                if (!objs) {
                    continue;
                }

                for (let obj: ClientObj | null = objs.tail() as ClientObj | null; obj; obj = objs.prev() as ClientObj | null) {
                    const type: ObjType = ObjType.get(obj.index);
                    if (this.objSelected === 1) {
                        this.menuOption[this.menuSize] = 'Use ' + this.objSelectedName + ' with @lre@' + type.name;
                        this.menuAction[this.menuSize] = MenuAction.OPOBJU;
                        this.menuParamA[this.menuSize] = obj.index;
                        this.menuParamB[this.menuSize] = x;
                        this.menuParamC[this.menuSize] = z;
                        this.menuSize++;
                    } else if (this.spellSelected !== 1) {
                        for (let op: number = 4; op >= 0; op--) {
                            if (type.op && type.op[op]) {
                                this.menuOption[this.menuSize] = type.op[op] + ' @lre@' + type.name;

                                if (op === 0) {
                                    this.menuAction[this.menuSize] = MenuAction.OPOBJ1;
                                } else if (op === 1) {
                                    this.menuAction[this.menuSize] = MenuAction.OPOBJ2;
                                } else if (op === 2) {
                                    this.menuAction[this.menuSize] = MenuAction.OPOBJ3;
                                } else if (op === 3) {
                                    this.menuAction[this.menuSize] = MenuAction.OPOBJ4;
                                } else if (op === 4) {
                                    this.menuAction[this.menuSize] = MenuAction.OPOBJ5;
                                }

                                this.menuParamA[this.menuSize] = obj.index;
                                this.menuParamB[this.menuSize] = x;
                                this.menuParamC[this.menuSize] = z;
                                this.menuSize++;
                            } else if (op === 2) {
                                this.menuOption[this.menuSize] = 'Take @lre@' + type.name;
                                this.menuAction[this.menuSize] = MenuAction.OPOBJ3;
                                this.menuParamA[this.menuSize] = obj.index;
                                this.menuParamB[this.menuSize] = x;
                                this.menuParamC[this.menuSize] = z;
                                this.menuSize++;
                            }
                        }

                        this.menuOption[this.menuSize] = 'Examine @lre@' + type.name;
                        this.menuAction[this.menuSize] = MenuAction.OPOBJ6;
                        this.menuParamA[this.menuSize] = obj.index;
                        this.menuParamB[this.menuSize] = x;
                        this.menuParamC[this.menuSize] = z;
                        this.menuSize++;
                    } else if ((this.activeSpellFlags & 0x1) === 1) {
                        this.menuOption[this.menuSize] = this.spellCaption + ' @lre@' + type.name;
                        this.menuAction[this.menuSize] = MenuAction.OPOBJT;
                        this.menuParamA[this.menuSize] = obj.index;
                        this.menuParamB[this.menuSize] = x;
                        this.menuParamC[this.menuSize] = z;
                        this.menuSize++;
                    }
                }
            }
        }
    }

    private handleMouseInput(): void {
        if (this.objDragArea !== 0) {
            return;
        }

        if (this.isMobile && this.chatbackInputOpen && this.insideChatPopupArea()) {
            return;
        }

        let button: number = this.mouseClickButton;
        if (this.spellSelected === 1 && this.mouseClickX >= 516 && this.mouseClickY >= 160 && this.mouseClickX <= 765 && this.mouseClickY <= 205) {
            button = 0;
        }

        if (!this.menuVisible) {
            if (button === 1 && this.menuSize > 0) {
                const action: number = this.menuAction[this.menuSize - 1];

                if (
                    action == MenuAction.INV_BUTTON1 || action == MenuAction.INV_BUTTON2 || action == MenuAction.INV_BUTTON3 || action == MenuAction.INV_BUTTON4 || action == MenuAction.INV_BUTTON5 ||
                    action == MenuAction.OPHELD1 || action == MenuAction.OPHELD2 || action == MenuAction.OPHELD3 || action == MenuAction.OPHELD4 || action == MenuAction.OPHELD5 ||
                    action == MenuAction.OPHELDT_START || action === MenuAction.OPHELD6
                ) {
                    const slot: number = this.menuParamB[this.menuSize - 1];
                    const comId: number = this.menuParamC[this.menuSize - 1];
                    const com: IfType = IfType.list[comId];

                    if (com.draggable || com.swappable) {
                        this.objGrabThreshold = false;
                        this.objDragCycles = 0;
                        this.objDragLayerId = comId;
                        this.objDragSlot = slot;
                        this.objDragArea = 2;
                        this.objGrabX = this.mouseClickX;
                        this.objGrabY = this.mouseClickY;

                        if (IfType.list[comId].layerId === this.mainLayerId) {
                            this.objDragArea = 1;
                        }

                        if (IfType.list[comId].layerId === this.chatLayerId) {
                            this.objDragArea = 3;
                        }

                        return;
                    }
                }
            }

            if (button === 1 && (this.oneMouseButton === 1 || this.isAddFriendOption(this.menuSize - 1)) && this.menuSize > 2) {
                button = 2;
            }

            if (button === 1 && this.menuSize > 0) {
                this.useMenuOption(this.menuSize - 1);
            } else if (button == 2 && this.menuSize > 0) {
                this.showContextMenu();
            }

            return;
        }

        if (button === 1) {
            const menuX: number = this.menuX;
            const menuY: number = this.menuY;
            const menuWidth: number = this.menuWidth;

            let clickX: number = this.mouseClickX;
            let clickY: number = this.mouseClickY;

            if (this.menuArea === 0) {
                clickX -= 4;
                clickY -= 4;
            } else if (this.menuArea === 1) {
                clickX -= 553;
                clickY -= 205;
            } else if (this.menuArea === 2) {
                clickX -= 17;
                clickY -= 357;
            }

            let option: number = -1;
            for (let i: number = 0; i < this.menuSize; i++) {
                const optionY: number = menuY + (this.menuSize - 1 - i) * 15 + 31;
                if (clickX > menuX && clickX < menuX + menuWidth && clickY > optionY - 13 && clickY < optionY + 3) {
                    option = i;
                }
            }

            if (option !== -1) {
                this.useMenuOption(option);
            }

            this.menuVisible = false;

            if (this.menuArea === 1) {
                this.redrawSidebar = true;
            } else if (this.menuArea === 2) {
                this.redrawChatback = true;
            }
        } else {
            let x: number = this.mouseX;
            let y: number = this.mouseY;

            if (this.menuArea === 0) {
                x -= 4;
                y -= 4;
            } else if (this.menuArea === 1) {
                x -= 553;
                y -= 205;
            } else if (this.menuArea === 2) {
                x -= 17;
                y -= 357;
            }

            if (x < this.menuX - 10 || x > this.menuX + this.menuWidth + 10 || y < this.menuY - 10 || y > this.menuY + this.menuHeight + 10) {
                this.menuVisible = false;

                if (this.menuArea === 1) {
                    this.redrawSidebar = true;
                }

                if (this.menuArea === 2) {
                    this.redrawChatback = true;
                }
            }
        }
    }

    handleMinimapInput(): void {
        if (this.mouseClickButton !== 1 || !this.localPlayer) {
            return;
        }

        let x: number = this.mouseClickX - 25 - 550;
        let y: number = this.mouseClickY - 4 - 4;

        if (x < 0 || y < 0 || x >= 146 || y >= 151) {
            return;
        }

        x -= 73;
        y -= 75;

        const yaw: number = (this.orbitCameraYaw + this.macroMinimapAngle) & 0x7ff;
        let sinYaw: number = Pix3D.sinTable[yaw];
        let cosYaw: number = Pix3D.cosTable[yaw];

        sinYaw = (sinYaw * (this.macroMinimapZoom + 256)) >> 8;
        cosYaw = (cosYaw * (this.macroMinimapZoom + 256)) >> 8;

        const relX: number = (y * sinYaw + x * cosYaw) >> 11;
        const relY: number = (y * cosYaw - x * sinYaw) >> 11;

        const tileX: number = (this.localPlayer.x + relX) >> 7;
        const tileZ: number = (this.localPlayer.z - relY) >> 7;

        if (this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], tileX, tileZ, 1, 0, 0, 0, 0, 0, true)) {
            // the additional 14-bytes in MOVE_MINIMAPCLICK
            this.out.p1(x);
            this.out.p1(y);
            this.out.p2(this.orbitCameraYaw);
            this.out.p1(57);
            this.out.p1(this.macroMinimapAngle);
            this.out.p1(this.macroMinimapZoom);
            this.out.p1(89);
            this.out.p2(this.localPlayer.x);
            this.out.p2(this.localPlayer.z);
            this.out.p1(this.tryMoveNearest);
            this.out.p1(63);
        }
    }

    private handleTabInput(): void {
        if (this.mouseClickButton !== 1) {
            return;
        }

        if (this.mouseClickX >= 539 && this.mouseClickX <= 573 && this.mouseClickY >= 169 && this.mouseClickY < 205 && this.sideTabLayerId[0] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 0;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 569 && this.mouseClickX <= 599 && this.mouseClickY >= 168 && this.mouseClickY < 205 && this.sideTabLayerId[1] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 1;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 597 && this.mouseClickX <= 627 && this.mouseClickY >= 168 && this.mouseClickY < 205 && this.sideTabLayerId[2] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 2;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 625 && this.mouseClickX <= 669 && this.mouseClickY >= 168 && this.mouseClickY < 203 && this.sideTabLayerId[3] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 3;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 666 && this.mouseClickX <= 696 && this.mouseClickY >= 168 && this.mouseClickY < 205 && this.sideTabLayerId[4] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 4;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 694 && this.mouseClickX <= 724 && this.mouseClickY >= 168 && this.mouseClickY < 205 && this.sideTabLayerId[5] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 5;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 722 && this.mouseClickX <= 756 && this.mouseClickY >= 169 && this.mouseClickY < 205 && this.sideTabLayerId[6] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 6;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 540 && this.mouseClickX <= 574 && this.mouseClickY >= 466 && this.mouseClickY < 502 && this.sideTabLayerId[7] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 7;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 572 && this.mouseClickX <= 602 && this.mouseClickY >= 466 && this.mouseClickY < 503 && this.sideTabLayerId[8] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 8;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 599 && this.mouseClickX <= 629 && this.mouseClickY >= 466 && this.mouseClickY < 503 && this.sideTabLayerId[9] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 9;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 627 && this.mouseClickX <= 671 && this.mouseClickY >= 467 && this.mouseClickY < 502 && this.sideTabLayerId[10] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 10;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 669 && this.mouseClickX <= 699 && this.mouseClickY >= 466 && this.mouseClickY < 503 && this.sideTabLayerId[11] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 11;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 696 && this.mouseClickX <= 726 && this.mouseClickY >= 466 && this.mouseClickY < 503 && this.sideTabLayerId[12] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 12;
            this.redrawSideicons = true;
        } else if (this.mouseClickX >= 724 && this.mouseClickX <= 758 && this.mouseClickY >= 466 && this.mouseClickY < 502 && this.sideTabLayerId[13] != -1) {
            this.redrawSidebar = true;
            this.sideTab = 13;
            this.redrawSideicons = true;
        }
    }

    private handleChatModeInput(): void {
        if (this.mouseClickButton !== 1) {
            return;
        }

        if (this.mouseClickX >= 6 && this.mouseClickX <= 106 && this.mouseClickY >= 467 && this.mouseClickY <= 499) {
            this.chatPublicMode = (this.chatPublicMode + 1) % 4;
            this.redrawPrivacySettings = true;
            this.redrawChatback = true;

            this.out.pIsaac(ClientProt.CHAT_SETMODE);
            this.out.p1(this.chatPublicMode);
            this.out.p1(this.chatPrivateMode);
            this.out.p1(this.chatTradeMode);
        } else if (this.mouseClickX >= 135 && this.mouseClickX <= 235 && this.mouseClickY >= 467 && this.mouseClickY <= 499) {
            this.chatPrivateMode = (this.chatPrivateMode + 1) % 3;
            this.redrawPrivacySettings = true;
            this.redrawChatback = true;

            this.out.pIsaac(ClientProt.CHAT_SETMODE);
            this.out.p1(this.chatPublicMode);
            this.out.p1(this.chatPrivateMode);
            this.out.p1(this.chatTradeMode);
        } else if (this.mouseClickX >= 273 && this.mouseClickX <= 373 && this.mouseClickY >= 467 && this.mouseClickY <= 499) {
            this.chatTradeMode = (this.chatTradeMode + 1) % 3;
            this.redrawPrivacySettings = true;
            this.redrawChatback = true;

            this.out.pIsaac(ClientProt.CHAT_SETMODE);
            this.out.p1(this.chatPublicMode);
            this.out.p1(this.chatPrivateMode);
            this.out.p1(this.chatTradeMode);
        } else if (this.mouseClickX >= 412 && this.mouseClickX <= 512 && this.mouseClickY >= 467 && this.mouseClickY <= 499) {
            this.closeModal();

            this.reportAbuseInput = '';
            this.reportAbuseMuteOption = false;

            for (let i: number = 0; i < IfType.list.length; i++) {
                if (IfType.list[i] && IfType.list[i].clientCode === ClientCode.CC_REPORT_INPUT) {
                    this.reportAbuseLayerId = this.mainLayerId = IfType.list[i].layerId;
                    break;
                }
            }

            if (this.isMobile) {
                MobileKeyboard.show();
            }
        }
    }

    // jag::oldscape::Client::CloseModal
    private closeModal(): void {
        this.out.pIsaac(ClientProt.CLOSE_MODAL);

        if (this.sideLayerId !== -1) {
            this.sideLayerId = -1;
            this.redrawSidebar = true;
            this.pressedContinueOption = false;
            this.redrawSideicons = true;
        }

        if (this.chatLayerId !== -1) {
            this.chatLayerId = -1;
            this.redrawChatback = true;
            this.pressedContinueOption = false;
        }

        this.mainLayerId = -1;
    }

    // jag::oldscape::Client::GlTimeoutChat
    private timeoutChat(): void {
        for (let i: number = -1; i < this.playerCount; i++) {
            let index: number;
            if (i === -1) {
                index = Constants.LOCAL_PLAYER_INDEX;
            } else {
                index = this.playerIds[i];
            }

            const player: ClientPlayer | null = this.players[index];
            if (player && player.chatTimer > 0) {
                player.chatTimer--;

                if (player.chatTimer === 0) {
                    player.chatMessage = null;
                }
            }
        }

        for (let i: number = 0; i < this.npcCount; i++) {
            const index: number = this.npcIds[i];
            const npc: ClientNpc | null = this.npc[index];

            if (npc && npc.chatTimer > 0) {
                npc.chatTimer--;

                if (npc.chatTimer === 0) {
                    npc.chatMessage = null;
                }
            }
        }
    }

    // jag::oldscape::Client::GlFollowCamera
    private followCamera(): void {
        if (!this.localPlayer) {
            return; // custom
        }

        const orbitX: number = this.localPlayer.x + this.macroCameraX;
        const orbitZ: number = this.localPlayer.z + this.macroCameraZ;

        if (this.orbitCameraX - orbitX < -500 || this.orbitCameraX - orbitX > 500 || this.orbitCameraZ - orbitZ < -500 || this.orbitCameraZ - orbitZ > 500) {
            this.orbitCameraX = orbitX;
            this.orbitCameraZ = orbitZ;
        }

        if (this.orbitCameraX !== orbitX) {
            this.orbitCameraX += ((orbitX - this.orbitCameraX) / 16) | 0;
        }

        if (this.orbitCameraZ !== orbitZ) {
            this.orbitCameraZ += ((orbitZ - this.orbitCameraZ) / 16) | 0;
        }

        if (this.keyHeld[1] === 1) {
            this.orbitCameraYawVelocity += ((-this.orbitCameraYawVelocity - 24) / 2) | 0;
        } else if (this.keyHeld[2] === 1) {
            this.orbitCameraYawVelocity += ((24 - this.orbitCameraYawVelocity) / 2) | 0;
        } else {
            this.orbitCameraYawVelocity = (this.orbitCameraYawVelocity / 2) | 0;
        }

        if (this.keyHeld[3] === 1) {
            this.orbitCameraPitchVelocity += ((12 - this.orbitCameraPitchVelocity) / 2) | 0;
        } else if (this.keyHeld[4] === 1) {
            this.orbitCameraPitchVelocity += ((-this.orbitCameraPitchVelocity - 12) / 2) | 0;
        } else {
            this.orbitCameraPitchVelocity = (this.orbitCameraPitchVelocity / 2) | 0;
        }

        this.orbitCameraYaw = ((this.orbitCameraYaw + this.orbitCameraYawVelocity / 2) | 0) & 0x7ff;
        this.orbitCameraPitch += (this.orbitCameraPitchVelocity / 2) | 0;

        if (this.orbitCameraPitch < 128) {
            this.orbitCameraPitch = 128;
        } else if (this.orbitCameraPitch > 383) {
            this.orbitCameraPitch = 383;
        }

        const orbitTileX: number = this.orbitCameraX >> 7;
        const orbitTileZ: number = this.orbitCameraZ >> 7;
        const orbitY: number = this.getAvH(this.minusedlevel, this.orbitCameraX, this.orbitCameraZ);
        let maxY: number = 0;

        if (this.groundh) {
            if (orbitTileX > 3 && orbitTileZ > 3 && orbitTileX < 100 && orbitTileZ < 100) {
                for (let x: number = orbitTileX - 4; x <= orbitTileX + 4; x++) {
                    for (let z: number = orbitTileZ - 4; z <= orbitTileZ + 4; z++) {
                        let level: number = this.minusedlevel;
                        if (level < 3 && this.mapl && (this.mapl[1][x][z] & MapFlag.VisBelow) !== 0) {
                            level++;
                        }

                        const y: number = orbitY - this.groundh[level][x][z];
                        if (y > maxY) {
                            maxY = y;
                        }
                    }
                }
            }
        }

        let clamp: number = maxY * 192;
        if (clamp > 98048) {
            clamp = 98048;
        } else if (clamp < 32768) {
            clamp = 32768;
        }

        if (clamp > this.cameraPitchClamp) {
            this.cameraPitchClamp += ((clamp - this.cameraPitchClamp) / 24) | 0;
        } else if (clamp < this.cameraPitchClamp) {
            this.cameraPitchClamp += ((clamp - this.cameraPitchClamp) / 80) | 0;
        }
    }

    // jag::oldscape::Client::GlCinemaCamera
    private cinemaCamera(): void {
        let x: number = this.camMoveToLx * 128 + 64;
        let z: number = this.camMoveToLz * 128 + 64;
        let y: number = this.getAvH(this.minusedlevel, x, z) - this.camMoveToHei;

        if (this.cinemaX < x) {
            this.cinemaX += this.camMoveToRate + ((((x - this.cinemaX) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaX > x) {
                this.cinemaX = x;
            }
        }

        if (this.cinemaX > x) {
            this.cinemaX -= this.camMoveToRate + ((((this.cinemaX - x) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaX < x) {
                this.cinemaX = x;
            }
        }

        if (this.cinemaY < y) {
            this.cinemaY += this.camMoveToRate + ((((y - this.cinemaY) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaY > y) {
                this.cinemaY = y;
            }
        }

        if (this.cinemaY > y) {
            this.cinemaY -= this.camMoveToRate + ((((this.cinemaY - y) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaY < y) {
                this.cinemaY = y;
            }
        }

        if (this.cinemaZ < z) {
            this.cinemaZ += this.camMoveToRate + ((((z - this.cinemaZ) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaZ > z) {
                this.cinemaZ = z;
            }
        }

        if (this.cinemaZ > z) {
            this.cinemaZ -= this.camMoveToRate + ((((this.cinemaZ - z) * this.camMoveToRate2) / 1000) | 0);
            if (this.cinemaZ < z) {
                this.cinemaZ = z;
            }
        }

        x = this.camLookAtLx * 128 + 64;
        z = this.camLookAtLz * 128 + 64;
        y = this.getAvH(this.minusedlevel, x, z) - this.camLookAtHei;

        const dx: number = x - this.cinemaX;
        const dy: number = y - this.cinemaY;
        const dz: number = z - this.cinemaZ;

        const distance: number = Math.sqrt(dx * dx + dz * dz) | 0;
        let pitch: number = ((Math.atan2(dy, distance) * 325.949) | 0) & 0x7ff;
        const yaw: number = ((Math.atan2(dx, dz) * -325.949) | 0) & 0x7ff;

        if (pitch < 128) {
            pitch = 128;
        } else if (pitch > 383) {
            pitch = 383;
        }

        if (this.cinemaPitch < pitch) {
            this.cinemaPitch += this.camLookAtRate + ((((pitch - this.cinemaPitch) * this.camLookAtRate2) / 1000) | 0);
            if (this.cinemaPitch > pitch) {
                this.cinemaPitch = pitch;
            }
        }

        if (this.cinemaPitch > pitch) {
            this.cinemaPitch -= this.camLookAtRate + ((((this.cinemaPitch - pitch) * this.camLookAtRate2) / 1000) | 0);
            if (this.cinemaPitch < pitch) {
                this.cinemaPitch = pitch;
            }
        }

        let deltaYaw: number = yaw - this.cinemaYaw;
        if (deltaYaw > 1024) {
            deltaYaw -= 2048;
        } else if (deltaYaw < -1024) {
            deltaYaw += 2048;
        }

        if (deltaYaw > 0) {
            this.cinemaYaw += this.camLookAtRate + (((deltaYaw * this.camLookAtRate2) / 1000) | 0);
            this.cinemaYaw &= 0x7ff;
        }

        if (deltaYaw < 0) {
            this.cinemaYaw -= this.camLookAtRate + (((-deltaYaw * this.camLookAtRate2) / 1000) | 0);
            this.cinemaYaw &= 0x7ff;
        }

        let tmp: number = yaw - this.cinemaYaw;
        if (tmp > 1024) {
            tmp -= 2048;
        } else if (tmp < -1024) {
            tmp += 2048;
        }

        if ((tmp < 0 && deltaYaw > 0) || (tmp > 0 && deltaYaw < 0)) {
            this.cinemaYaw = yaw;
        }
    }

    private async handleInputKey(): Promise<void> {
        Client.cyclelogic4++;
        if (Client.cyclelogic4 > 192) {
            Client.cyclelogic4 = 0;

            this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC4);
            this.out.p1(232);
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let key: number;
            do {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    key = this.pollKey();
                    if (key === -1) {
                        return;
                    }

                    if (this.mainLayerId !== -1 && this.mainLayerId === this.reportAbuseLayerId) {
                        if (key === 8 && this.reportAbuseInput.length > 0) {
                            this.reportAbuseInput = this.reportAbuseInput.substring(0, this.reportAbuseInput.length - 1);
                        }
                        break;
                    }

                    if (this.showSocialInput) {
                        if (key >= 32 && key <= 122 && this.socialInput.length < 80) {
                            this.socialInput = this.socialInput + String.fromCharCode(key);
                            this.redrawChatback = true;
                        }

                        if (key === 8 && this.socialInput.length > 0) {
                            this.socialInput = this.socialInput.substring(0, this.socialInput.length - 1);
                            this.redrawChatback = true;
                        }

                        if (key === 13 || key === 10) {
                            this.showSocialInput = false;
                            this.redrawChatback = true;

                            let username: bigint;
                            if (this.socialInputType === 1) {
                                username = JString.toBase37(this.socialInput);
                                this.addFriend(username);
                            }

                            if (this.socialInputType === 2 && this.friendCount > 0) {
                                username = JString.toBase37(this.socialInput);
                                this.delFriend(username);
                            }

                            if (this.socialInputType === 3 && this.socialInput.length > 0 && this.socialName37) {
                                this.out.pIsaac(ClientProt.MESSAGE_PRIVATE);
                                this.out.p1(0);
                                const start: number = this.out.pos;

                                this.out.p8(this.socialName37);
                                WordPack.pack(this.out, this.socialInput);
                                this.out.psize1(this.out.pos - start);

                                this.socialInput = JString.toSentenceCase(this.socialInput);
                                this.socialInput = WordFilter.filter(this.socialInput);
                                this.addChat(6, this.socialInput, JString.formatName(JString.fromBase37(this.socialName37)));

                                if (this.chatPrivateMode === 2) {
                                    this.chatPrivateMode = 1;
                                    this.redrawPrivacySettings = true;

                                    this.out.pIsaac(ClientProt.CHAT_SETMODE);
                                    this.out.p1(this.chatPublicMode);
                                    this.out.p1(this.chatPrivateMode);
                                    this.out.p1(this.chatTradeMode);
                                }
                            }

                            if (this.socialInputType === 4 && this.ignoreCount < 100) {
                                username = JString.toBase37(this.socialInput);
                                this.addIgnore(username);
                            }

                            if (this.socialInputType === 5 && this.ignoreCount > 0) {
                                username = JString.toBase37(this.socialInput);
                                this.delIgnore(username);
                            }
                        }
                    } else if (this.chatbackInputOpen) {
                        if (key >= 48 && key <= 57 && this.chatbackInput.length < 10) {
                            this.chatbackInput = this.chatbackInput + String.fromCharCode(key);
                            this.redrawChatback = true;
                        }

                        if (key === 8 && this.chatbackInput.length > 0) {
                            this.chatbackInput = this.chatbackInput.substring(0, this.chatbackInput.length - 1);
                            this.redrawChatback = true;
                        }

                        if (key === 13 || key === 10) {
                            if (this.chatbackInput.length > 0) {
                                let value: number = 0;
                                try {
                                    value = parseInt(this.chatbackInput, 10);
                                } catch (e) {
                                }

                                this.out.pIsaac(ClientProt.RESUME_P_COUNTDIALOG);
                                this.out.p4(value);
                            }

                            this.chatbackInputOpen = false;
                            this.redrawChatback = true;
                        }
                    } else if (this.chatLayerId === -1) {
                        // custom: when typing a command, you can use the debugproc character (tilde)
                        if (key >= 32 && (key <= 122 || (this.chatTyped.startsWith('::') && key <= 126)) && this.chatTyped.length < 80) {
                            this.chatTyped = this.chatTyped + String.fromCharCode(key);
                            this.redrawChatback = true;
                        }

                        if (key === 8 && this.chatTyped.length > 0) {
                            this.chatTyped = this.chatTyped.substring(0, this.chatTyped.length - 1);
                            this.redrawChatback = true;
                        }

                        if ((key === 13 || key === 10) && this.chatTyped.length > 0) {
                            if (this.staffmodlevel === 2) {
                                if (this.chatTyped === '::clientdrop') {
                                    await this.tryReconnect();
                                } else if (this.chatTyped === '::prefetchmusic') {
                                    if (this.onDemand) {
                                        for (let i = 0; i < this.onDemand.getFileCount(2); i++) {
                                            this.onDemand.prefetchPriority(2, i, 1);
                                        }
                                    }
                                } else if (this.chatTyped === '::lag') {
                                    this.lag();
                                }
                            }

                            // custom: player-facing commands
                            if (this.chatTyped === '::fpson') {
                                // authentic in later revs
                                this.displayFps = true;
                            } else if (this.chatTyped === '::fpsoff') {
                                // authentic in later revs
                                this.displayFps = false;
                            } else if (this.chatTyped.startsWith('::fps ')) {
                                // custom ::fps command for setting a target framerate
                                try {
                                    const desiredFps = parseInt(this.chatTyped.substring(6)) || 50;
                                    this.setTargetedFramerate(desiredFps);
                                } catch (e) { }
                            } else if (this.chatTyped.startsWith('::')) {
                                this.out.pIsaac(ClientProt.CLIENT_CHEAT);
                                this.out.p1(this.chatTyped.length - 1);
                                this.out.pjstr(this.chatTyped.substring(2));
                            } else {
                                let color: number = 0;
                                if (this.chatTyped.startsWith('yellow:')) {
                                    color = 0;
                                    this.chatTyped = this.chatTyped.substring(7);
                                } else if (this.chatTyped.startsWith('red:')) {
                                    color = 1;
                                    this.chatTyped = this.chatTyped.substring(4);
                                } else if (this.chatTyped.startsWith('green:')) {
                                    color = 2;
                                    this.chatTyped = this.chatTyped.substring(6);
                                } else if (this.chatTyped.startsWith('cyan:')) {
                                    color = 3;
                                    this.chatTyped = this.chatTyped.substring(5);
                                } else if (this.chatTyped.startsWith('purple:')) {
                                    color = 4;
                                    this.chatTyped = this.chatTyped.substring(7);
                                } else if (this.chatTyped.startsWith('white:')) {
                                    color = 5;
                                    this.chatTyped = this.chatTyped.substring(6);
                                } else if (this.chatTyped.startsWith('flash1:')) {
                                    color = 6;
                                    this.chatTyped = this.chatTyped.substring(7);
                                } else if (this.chatTyped.startsWith('flash2:')) {
                                    color = 7;
                                    this.chatTyped = this.chatTyped.substring(7);
                                } else if (this.chatTyped.startsWith('flash3:')) {
                                    color = 8;
                                    this.chatTyped = this.chatTyped.substring(7);
                                } else if (this.chatTyped.startsWith('glow1:')) {
                                    color = 9;
                                    this.chatTyped = this.chatTyped.substring(6);
                                } else if (this.chatTyped.startsWith('glow2:')) {
                                    color = 10;
                                    this.chatTyped = this.chatTyped.substring(6);
                                } else if (this.chatTyped.startsWith('glow3:')) {
                                    color = 11;
                                    this.chatTyped = this.chatTyped.substring(6);
                                }

                                let effect: number = 0;
                                if (this.chatTyped.startsWith('wave:')) {
                                    effect = 1;
                                    this.chatTyped = this.chatTyped.substring(5);
                                }
                                if (this.chatTyped.startsWith('scroll:')) {
                                    effect = 2;
                                    this.chatTyped = this.chatTyped.substring(7);
                                }

                                this.out.pIsaac(ClientProt.MESSAGE_PUBLIC);
                                this.out.p1(0);
                                const start: number = this.out.pos;

                                this.out.p1(color);
                                this.out.p1(effect);
                                WordPack.pack(this.out, this.chatTyped);
                                this.out.psize1(this.out.pos - start);

                                this.chatTyped = JString.toSentenceCase(this.chatTyped);
                                this.chatTyped = WordFilter.filter(this.chatTyped);

                                if (this.localPlayer && this.localPlayer.name) {
                                    this.localPlayer.chatMessage = this.chatTyped;
                                    this.localPlayer.chatColour = color;
                                    this.localPlayer.chatEffect = effect;
                                    this.localPlayer.chatTimer = 150;

                                    if (this.staffmodlevel === 2) {
                                        this.addChat(2, this.localPlayer.chatMessage, '@cr2@' + this.localPlayer.name);
                                    } else if (this.staffmodlevel === 1) {
                                        this.addChat(2, this.localPlayer.chatMessage, '@cr1@' + this.localPlayer.name);
                                    } else {
                                        this.addChat(2, this.localPlayer.chatMessage, this.localPlayer.name);
                                    }
                                }

                                if (this.chatPublicMode === 2) {
                                    this.chatPublicMode = 3;
                                    this.redrawPrivacySettings = true;

                                    this.out.pIsaac(ClientProt.CHAT_SETMODE);
                                    this.out.p1(this.chatPublicMode);
                                    this.out.p1(this.chatPrivateMode);
                                    this.out.p1(this.chatTradeMode);
                                }
                            }

                            this.chatTyped = '';
                            this.redrawChatback = true;
                        }
                    }
                }
            } while ((key < 97 || key > 122) && (key < 65 || key > 90) && (key < 48 || key > 57) && key !== 32);

            if (this.reportAbuseInput.length < 12) {
                this.reportAbuseInput = this.reportAbuseInput + String.fromCharCode(key);
            }
        }
    }

    private lag() {
        console.log('============');
        console.log(`flame-cycle:${this.flameCycle0}`);
        if (this.onDemand) {
            console.log(`od-cycle:${this.onDemand.cycle}`);
        }
        console.log(`loop-cycle:${this.loopCycle}`);
        console.log(`draw-cycle:${this.drawCycle}`);
        console.log(`ptype:${this.ptype}`);
        console.log(`psize:${this.psize}`);
        // this.stream?.debug();
        this.debug = true;
    }

    // jag::oldscape::Client::GlMovePlayers
    private movePlayers(): void {
        for (let i: number = -1; i < this.playerCount; i++) {
            let index: number;
            if (i === -1) {
                index = Constants.LOCAL_PLAYER_INDEX;
            } else {
                index = this.playerIds[i];
            }

            const player: ClientPlayer | null = this.players[index];
            if (player) {
                this.moveEntity(player);
            }
        }
    }

    // jag::oldscape::Client::GlMoveNpcs
    private moveNpcs(): void {
        for (let i: number = 0; i < this.npcCount; i++) {
            const id: number = this.npcIds[i];
            const npc: ClientNpc | null = this.npc[id];

            if (npc && npc.type) {
                this.moveEntity(npc);
            }
        }
    }

    // jag::oldscape::Client::GlMoveEntity
    private moveEntity(e: ClientEntity): void {
        if (e.x < 128 || e.z < 128 || e.x >= 13184 || e.z >= 13184) {
            e.primarySeqId = -1;
            e.spotanimId = -1;
            e.exactMoveEndCycle = 0;
            e.exactMoveStartCycle = 0;
            e.x = e.routeTileX[0] * 128 + e.size * 64;
            e.z = e.routeTileZ[0] * 128 + e.size * 64;
            e.abortRoute();
        }

        if (e === this.localPlayer && (e.x < 1536 || e.z < 1536 || e.x >= 11776 || e.z >= 11776)) {
            e.primarySeqId = -1;
            e.spotanimId = -1;
            e.exactMoveEndCycle = 0;
            e.exactMoveStartCycle = 0;
            e.x = e.routeTileX[0] * 128 + e.size * 64;
            e.z = e.routeTileZ[0] * 128 + e.size * 64;
            e.abortRoute();
        }

        if (e.exactMoveEndCycle > this.loopCycle) {
            this.exactMove1(e);
        } else if (e.exactMoveStartCycle >= this.loopCycle) {
            this.exactMove2(e);
        } else {
            this.routeMove(e);
        }

        this.entityFace(e);
        this.entityAnim(e);
    }

    // jag::oldscape::Client::GlExactMove1
    private exactMove1(e: ClientEntity): void {
        const delta: number = e.exactMoveEndCycle - this.loopCycle;
        const dstX: number = e.exactMoveStartSceneTileX * 128 + e.size * 64;
        const dstZ: number = e.exactMoveStartSceneTileZ * 128 + e.size * 64;

        e.x += ((dstX - e.x) / delta) | 0;
        e.z += ((dstZ - e.z) / delta) | 0;

        e.seqDelayMove = 0;

        if (e.exactMoveFacing === 0) {
            e.dstYaw = 1024;
        } else if (e.exactMoveFacing === 1) {
            e.dstYaw = 1536;
        } else if (e.exactMoveFacing === 2) {
            e.dstYaw = 0;
        } else if (e.exactMoveFacing === 3) {
            e.dstYaw = 512;
        }
    }

    // jag::oldscape::Client::GlExactMove2
    private exactMove2(e: ClientEntity): void {
        if (e.exactMoveStartCycle === this.loopCycle || e.primarySeqId === -1 || e.primarySeqDelay !== 0 || e.primarySeqCycle + 1 > SeqType.list[e.primarySeqId].getDuration(e.primarySeqFrame)) {
            const duration: number = e.exactMoveStartCycle - e.exactMoveEndCycle;
            const delta: number = this.loopCycle - e.exactMoveEndCycle;
            const dx0: number = e.exactMoveStartSceneTileX * 128 + e.size * 64;
            const dz0: number = e.exactMoveStartSceneTileZ * 128 + e.size * 64;
            const dx1: number = e.exactMoveEndSceneTileX * 128 + e.size * 64;
            const dz1: number = e.exactMoveEndSceneTileZ * 128 + e.size * 64;
            e.x = ((dx0 * (duration - delta) + dx1 * delta) / duration) | 0;
            e.z = ((dz0 * (duration - delta) + dz1 * delta) / duration) | 0;
        }

        e.seqDelayMove = 0;

        if (e.exactMoveFacing === 0) {
            e.dstYaw = 1024;
        } else if (e.exactMoveFacing === 1) {
            e.dstYaw = 1536;
        } else if (e.exactMoveFacing === 2) {
            e.dstYaw = 0;
        } else if (e.exactMoveFacing === 3) {
            e.dstYaw = 512;
        }

        e.yaw = e.dstYaw;
    }

    // jag::oldscape::Client::GlRouteMove
    private routeMove(e: ClientEntity): void {
        e.secondarySeqId = e.readyanim;

        if (e.routeLength === 0) {
            e.seqDelayMove = 0;
            return;
        }

        if (e.primarySeqId !== -1 && e.primarySeqDelay === 0) {
            const seq: SeqType = SeqType.list[e.primarySeqId];
            if (e.preanimRouteLength > 0 && seq.preanim_move === PreanimMove.DELAYMOVE) {
                e.seqDelayMove++;
                return;
            }

            if (e.preanimRouteLength <= 0 && seq.postanim_move === PostanimMove.DELAYMOVE) {
                e.seqDelayMove++;
                return;
            }
        }

        const x: number = e.x;
        const z: number = e.z;
        const dstX: number = e.routeTileX[e.routeLength - 1] * 128 + e.size * 64;
        const dstZ: number = e.routeTileZ[e.routeLength - 1] * 128 + e.size * 64;

        if (dstX - x > 256 || dstX - x < -256 || dstZ - z > 256 || dstZ - z < -256) {
            e.x = dstX;
            e.z = dstZ;
            return;
        }

        if (x < dstX) {
            if (z < dstZ) {
                e.dstYaw = 1280;
            } else if (z > dstZ) {
                e.dstYaw = 1792;
            } else {
                e.dstYaw = 1536;
            }
        } else if (x > dstX) {
            if (z < dstZ) {
                e.dstYaw = 768;
            } else if (z > dstZ) {
                e.dstYaw = 256;
            } else {
                e.dstYaw = 512;
            }
        } else if (z < dstZ) {
            e.dstYaw = 1024;
        } else {
            e.dstYaw = 0;
        }

        let deltaYaw: number = (e.dstYaw - e.yaw) & 0x7ff;
        if (deltaYaw > 1024) {
            deltaYaw -= 2048;
        }

        let seqId: number = e.walkanim_b;
        if (deltaYaw >= -256 && deltaYaw <= 256) {
            seqId = e.walkanim;
        } else if (deltaYaw >= 256 && deltaYaw < 768) {
            seqId = e.walkanim_r;
        } else if (deltaYaw >= -768 && deltaYaw <= -256) {
            seqId = e.walkanim_l;
        }

        if (seqId === -1) {
            seqId = e.walkanim;
        }

        e.secondarySeqId = seqId;

        let moveSpeed: number = 4;
        if (e.yaw !== e.dstYaw && e.faceEntity === -1) {
            moveSpeed = 2;
        }

        if (e.routeLength > 2) {
            moveSpeed = 6;
        }

        if (e.routeLength > 3) {
            moveSpeed = 8;
        }

        if (e.seqDelayMove > 0 && e.routeLength > 1) {
            moveSpeed = 8;
            e.seqDelayMove--;
        }

        if (e.routeRun[e.routeLength - 1]) {
            moveSpeed <<= 0x1;
        }

        if (moveSpeed >= 8 && e.secondarySeqId === e.walkanim && e.runanim !== -1) {
            e.secondarySeqId = e.runanim;
        }

        if (x < dstX) {
            e.x += moveSpeed;
            if (e.x > dstX) {
                e.x = dstX;
            }
        } else if (x > dstX) {
            e.x -= moveSpeed;
            if (e.x < dstX) {
                e.x = dstX;
            }
        }
        if (z < dstZ) {
            e.z += moveSpeed;
            if (e.z > dstZ) {
                e.z = dstZ;
            }
        } else if (z > dstZ) {
            e.z -= moveSpeed;
            if (e.z < dstZ) {
                e.z = dstZ;
            }
        }

        if (e.x === dstX && e.z === dstZ) {
            e.routeLength--;
            if (e.preanimRouteLength > 0) {
                e.preanimRouteLength--;
            }
        }
    }

    // jag::oldscape::Client::GlEntityFace
    private entityFace(e: ClientEntity): void {
        if (e.faceEntity !== -1 && e.faceEntity < 32768) {
            const npc: ClientNpc | null = this.npc[e.faceEntity];
            if (npc) {
                const dstX: number = e.x - npc.x;
                const dstZ: number = e.z - npc.z;

                if (dstX !== 0 || dstZ !== 0) {
                    e.dstYaw = ((Math.atan2(dstX, dstZ) * 325.949) | 0) & 0x7ff;
                }
            }
        }

        if (e.faceEntity >= 32768) {
            let index: number = e.faceEntity - 32768;
            if (index === this.localPid) {
                index = Constants.LOCAL_PLAYER_INDEX;
            }

            const player: ClientPlayer | null = this.players[index];
            if (player) {
                const dstX: number = e.x - player.x;
                const dstZ: number = e.z - player.z;

                if (dstX !== 0 || dstZ !== 0) {
                    e.dstYaw = ((Math.atan2(dstX, dstZ) * 325.949) | 0) & 0x7ff;
                }
            }
        }

        if ((e.faceSquareX !== 0 || e.faceSquareZ !== 0) && (e.routeLength === 0 || e.seqDelayMove > 0)) {
            const dstX: number = e.x - (e.faceSquareX - this.mapBuildBaseX - this.mapBuildBaseX) * 64;
            const dstZ: number = e.z - (e.faceSquareZ - this.mapBuildBaseZ - this.mapBuildBaseZ) * 64;

            if (dstX !== 0 || dstZ !== 0) {
                e.dstYaw = ((Math.atan2(dstX, dstZ) * 325.949) | 0) & 0x7ff;
            }

            e.faceSquareX = 0;
            e.faceSquareZ = 0;
        }

        const remainingYaw: number = (e.dstYaw - e.yaw) & 0x7ff;
        if (remainingYaw !== 0) {
            if (remainingYaw < 32 || remainingYaw > 2016) {
                e.yaw = e.dstYaw;
            } else if (remainingYaw > 1024) {
                e.yaw -= 32;
            } else {
                e.yaw += 32;
            }

            e.yaw &= 0x7ff;

            if (e.secondarySeqId === e.readyanim && e.yaw !== e.dstYaw) {
                if (e.turnanim != -1) {
                    e.secondarySeqId = e.turnanim;
                } else {
                    e.secondarySeqId = e.walkanim;
                }
            }
        }
    }

    // jag::oldscape::Client::GlEntityAnim
    private entityAnim(e: ClientEntity): void {
        e.needsForwardDrawPadding = false;

        let seq: SeqType | null;
        if (e.secondarySeqId !== -1) {
            seq = SeqType.list[e.secondarySeqId];
            e.secondarySeqCycle++;

            if (e.secondarySeqFrame < seq.numFrames && e.secondarySeqCycle > seq.getDuration(e.secondarySeqFrame)) {
                e.secondarySeqCycle = 0;
                e.secondarySeqFrame++;
            }

            if (e.secondarySeqFrame >= seq.numFrames) {
                e.secondarySeqCycle = 0;
                e.secondarySeqFrame = 0;
            }
        }

        if (e.spotanimId !== -1 && this.loopCycle >= e.spotanimLastCycle) {
            if (e.spotanimFrame < 0) {
                e.spotanimFrame = 0;
            }

            seq = SpotAnimType.list[e.spotanimId].seq;
            e.spotanimCycle++;

            while (seq && e.spotanimFrame < seq.numFrames && e.spotanimCycle > seq.getDuration(e.spotanimFrame)) {
                e.spotanimCycle -= seq.getDuration(e.spotanimFrame);
                e.spotanimFrame++;
            }

            if (seq && e.spotanimFrame >= seq.numFrames) {
                if (e.spotanimFrame < 0 || e.spotanimFrame >= seq.numFrames) {
                    e.spotanimId = -1;
                }
            }
        }

        if (e.primarySeqId != -1 && e.primarySeqDelay <= 1) {
            seq = SeqType.list[e.primarySeqId];
            if (seq.preanim_move === PreanimMove.DELAYANIM && e.preanimRouteLength > 0 && this.loopCycle >= e.exactMoveStartCycle && this.loopCycle > e.exactMoveEndCycle) {
                e.primarySeqDelay = 1;
                return;
            }
        }

        if (e.primarySeqId !== -1 && e.primarySeqDelay === 0) {
            seq = SeqType.list[e.primarySeqId];
            e.primarySeqCycle++;

            while (e.primarySeqFrame < seq.numFrames && e.primarySeqCycle > seq.getDuration(e.primarySeqFrame)) {
                e.primarySeqCycle -= seq.getDuration(e.primarySeqFrame);
                e.primarySeqFrame++;
            }

            if (e.primarySeqFrame >= seq.numFrames) {
                e.primarySeqFrame -= seq.loops;
                e.primarySeqLoop++;

                if (e.primarySeqLoop >= seq.maxloops) {
                    e.primarySeqId = -1;
                }

                if (e.primarySeqFrame < 0 || e.primarySeqFrame >= seq.numFrames) {
                    e.primarySeqId = -1;
                }
            }

            e.needsForwardDrawPadding = seq.stretches;
        }

        if (e.primarySeqDelay > 0) {
            e.primarySeqDelay--;
        }
    }

    private async loadTitle(): Promise<void> {
        if (this.imageTitle2) {
            return;
        }

        this.drawArea = null;
        this.areaChatback = null;
        this.areaMapback = null;
        this.areaSidebar = null;
        this.areaViewport = null;
        this.areaBackbase1 = null;
        this.areaBackbase2 = null;
        this.areaBackhmid1 = null;

        this.imageTitle0 = new PixMap(128, 265);
        Pix2D.cls();

        this.imageTitle1 = new PixMap(128, 265);
        Pix2D.cls();

        this.imageTitle2 = new PixMap(509, 171);
        Pix2D.cls();

        this.imageTitle3 = new PixMap(360, 132);
        Pix2D.cls();

        this.imageTitle4 = new PixMap(360, 200);
        Pix2D.cls();

        this.imageTitle5 = new PixMap(202, 238);
        Pix2D.cls();

        this.imageTitle6 = new PixMap(203, 238);
        Pix2D.cls();

        this.imageTitle7 = new PixMap(74, 94);
        Pix2D.cls();

        this.imageTitle8 = new PixMap(75, 94);
        Pix2D.cls();

        if (this.jagTitle) {
            await this.loadTitleBackground();
            this.loadTitleImages();
        }

        this.redrawFrame = true;
    }

    private async loadTitleBackground(): Promise<void> {
        if (!this.jagTitle) {
            return;
        }

        const background: Pix32 = await Pix32.loadJpeg(this.jagTitle, 'title');

        this.imageTitle0?.bind();
        background.quickPlotSprite(0, 0);

        this.imageTitle1?.bind();
        background.quickPlotSprite(-637, 0);

        this.imageTitle2?.bind();
        background.quickPlotSprite(-128, 0);

        this.imageTitle3?.bind();
        background.quickPlotSprite(-202, -371);

        this.imageTitle4?.bind();
        background.quickPlotSprite(-202, -171);

        this.imageTitle5?.bind();
        background.quickPlotSprite(0, -265);

        this.imageTitle6?.bind();
        background.quickPlotSprite(-562, -265);

        this.imageTitle7?.bind();
        background.quickPlotSprite(-128, -171);

        this.imageTitle8?.bind();
        background.quickPlotSprite(-562, -171);

        // draw right side (mirror image)
        background.hflip();

        this.imageTitle0?.bind();
        background.quickPlotSprite(382, 0);

        this.imageTitle1?.bind();
        background.quickPlotSprite(-255, 0);

        this.imageTitle2?.bind();
        background.quickPlotSprite(254, 0);

        this.imageTitle3?.bind();
        background.quickPlotSprite(180, -371);

        this.imageTitle4?.bind();
        background.quickPlotSprite(180, -171);

        this.imageTitle5?.bind();
        background.quickPlotSprite(382, -265);

        this.imageTitle6?.bind();
        background.quickPlotSprite(-180, -265);

        this.imageTitle7?.bind();
        background.quickPlotSprite(254, -171);

        this.imageTitle8?.bind();
        background.quickPlotSprite(-180, -171);

        const logo: Pix32 = Pix32.load(this.jagTitle, 'logo');
        this.imageTitle2?.bind();
        logo.plotSprite(((this.width / 2) | 0) - ((logo.wi / 2) | 0) - 128, 18);
    }

    private loadTitleImages(): void {
        if (!this.jagTitle) {
            return;
        }

        this.imageTitlebox = Pix8.load(this.jagTitle, 'titlebox');
        this.imageTitlebutton = Pix8.load(this.jagTitle, 'titlebutton');
        for (let i: number = 0; i < 12; i++) {
            this.imageRunes[i] = Pix8.load(this.jagTitle, 'runes', i);
        }
        this.imageFlamesLeft = new Pix32(128, 265);
        this.imageFlamesRight = new Pix32(128, 265);

        if (this.imageTitle0) arraycopy(this.imageTitle0.data, 0, this.imageFlamesLeft.data, 0, 33920);
        if (this.imageTitle1) arraycopy(this.imageTitle1.data, 0, this.imageFlamesRight.data, 0, 33920);

        this.flameGradient0 = new Int32Array(256);
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient0[index] = index * 262144;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient0[index + 64] = index * 1024 + Colors.RED;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient0[index + 128] = index * 4 + Colors.YELLOW;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient0[index + 192] = Colors.WHITE;
        }

        this.flameGradient1 = new Int32Array(256);
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient1[index] = index * 1024;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient1[index + 64] = index * 4 + Colors.GREEN;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient1[index + 128] = index * 262144 + Colors.CYAN;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient1[index + 192] = Colors.WHITE;
        }

        this.flameGradient2 = new Int32Array(256);
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient2[index] = index * 4;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient2[index + 64] = index * 262144 + Colors.BLUE;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient2[index + 128] = index * 1024 + Colors.MAGENTA;
        }
        for (let index: number = 0; index < 64; index++) {
            this.flameGradient2[index + 192] = Colors.WHITE;
        }

        this.flameGradient = new Int32Array(256);
        this.flameBuffer0 = new Int32Array(32768);
        this.flameBuffer1 = new Int32Array(32768);
        this.generateFlameCoolingMap(null);
        this.flameBuffer3 = new Int32Array(32768);
        this.flameBuffer2 = new Int32Array(32768);

        this.drawProgress(10, 'Connecting to fileserver').then((): void => {
            if (!this.flameActive) {
                this.flameActive = true;
                this.flamesInterval = setInterval(this.renderFlames.bind(this), 35);
            }
        });
    }

    // jag::oldscape::TitleScreen::Draw
    private async titleScreenDraw(): Promise<void> {
        await this.loadTitle();
        this.imageTitle4?.bind();
        this.imageTitlebox?.plotSprite(0, 0);

        const w: number = 360;
        const h: number = 200;

        if (this.loginscreen === 0) {
            const extraY: number = ((h / 2) | 0) + 80;
            let y: number = ((h / 2) | 0) - 20;

            if (this.onDemand) {
                this.fontPlain11?.centreStringTag(w / 2, extraY, this.onDemand.message, 0x75a9a9, true);
            }

            this.fontBold12?.centreStringTag(w / 2, y, 'Welcome to RuneScape', Colors.YELLOW, true);
            y += 30;

            let x = ((w / 2) | 0) - 80;
            y = ((h / 2) | 0) + 20;
            this.imageTitlebutton?.plotSprite(x - 73, y - 20);
            this.fontBold12?.centreStringTag(x, y + 5, 'New user', Colors.WHITE, true);

            x = ((w / 2) | 0) + 80;
            this.imageTitlebutton?.plotSprite(x - 73, y - 20);
            this.fontBold12?.centreStringTag(x, y + 5, 'Existing User', Colors.WHITE, true);
        } else if (this.loginscreen === 2) {
            let x: number = ((w / 2) | 0) - 80;
            let y: number = ((h / 2) | 0) - 40;
            if (this.loginMes1.length > 0) {
                this.fontBold12?.centreStringTag(w / 2, y - 15, this.loginMes1, Colors.YELLOW, true);
                this.fontBold12?.centreStringTag(w / 2, y, this.loginMes2, Colors.YELLOW, true);
                y += 30;
            } else {
                this.fontBold12?.centreStringTag(w / 2, y - 7, this.loginMes2, Colors.YELLOW, true);
                y += 30;
            }

            this.fontBold12?.drawStringTag(w / 2 - 90, y, `Username: ${this.loginUser}${this.loginSelect === 0 && this.loopCycle % 40 < 20 ? '@yel@|' : ''}`, Colors.WHITE, true);
            y += 15;

            this.fontBold12?.drawStringTag(w / 2 - 88, y, `Password: ${JString.toAsterisks(this.loginPass)}${this.loginSelect === 1 && this.loopCycle % 40 < 20 ? '@yel@|' : ''}`, Colors.WHITE, true);
            y += 15;

            x = ((w / 2) | 0) - 80;
            y = ((h / 2) | 0) + 50;
            this.imageTitlebutton?.plotSprite(x - 73, y - 20);
            this.fontBold12?.centreStringTag(x, y + 5, 'Login', Colors.WHITE, true);

            x = ((w / 2) | 0) + 80;
            this.imageTitlebutton?.plotSprite(x - 73, y - 20);
            this.fontBold12?.centreStringTag(x, y + 5, 'Cancel', Colors.WHITE, true);
        } else if (this.loginscreen === 3) {
            let x: number = (w / 2) | 0;
            let y: number = ((h / 2) | 0) - 60;
            this.fontBold12?.centreStringTag(x, y, 'Create a free account', Colors.YELLOW, true);

            y = ((h / 2) | 0) - 35;
            this.fontBold12?.centreStringTag(x, y, 'To create a new account you need to', Colors.WHITE, true);
            y += 15;

            this.fontBold12?.centreStringTag(x, y, 'go back to the main RuneScape webpage', Colors.WHITE, true);
            y += 15;

            this.fontBold12?.centreStringTag(x, y, "and choose the red 'create account'", Colors.WHITE, true);
            y += 15;

            this.fontBold12?.centreStringTag(x, y, 'button at the top right of that page.', Colors.WHITE, true);
            y += 15;

            x = (w / 2) | 0;
            y = ((h / 2) | 0) + 50;
            this.imageTitlebutton?.plotSprite(x - 73, y - 20);
            this.fontBold12?.centreStringTag(x, y + 5, 'Cancel', Colors.WHITE, true);
        }

        this.imageTitle4?.draw(202, 171);

        if (this.redrawFrame) {
            this.redrawFrame = false;
            this.imageTitle2?.draw(128, 0);
            this.imageTitle3?.draw(202, 371);
            this.imageTitle5?.draw(0, 265);
            this.imageTitle6?.draw(562, 265);
            this.imageTitle7?.draw(128, 171);
            this.imageTitle8?.draw(562, 171);
        }
    }

    // jag::oldscape::Client::GameDraw
    private gameDraw(): void {
        if (this.players === null) {
            // client is unloading asynchronously
            return;
        }

        if (this.redrawFrame) {
            this.redrawFrame = false;

            this.areaBackleft1?.draw(0, 4);
            this.areaBackleft2?.draw(0, 357);
            this.areaBackright1?.draw(722, 4);
            this.areaBackright2?.draw(743, 205);
            this.areaBacktop1?.draw(0, 0);
            this.areaBackvmid1?.draw(516, 4);
            this.areaBackvmid2?.draw(516, 205);
            this.areaBackvmid3?.draw(496, 357);
            this.areaBackhmid2?.draw(0, 338);

            this.redrawSidebar = true;
            this.redrawChatback = true;
            this.redrawSideicons = true;
            this.redrawPrivacySettings = true;

            if (this.sceneState !== 2) {
                this.areaViewport?.draw(4, 4);
                this.areaMapback?.draw(550, 4);
            }
        }

        if (this.sceneState === 2) {
            this.gameDrawMain();
        }

        if (this.menuVisible && this.menuArea === 1) {
            this.redrawSidebar = true;
        }

        if (this.sideLayerId !== -1) {
            let redraw = this.animateLayer(this.sideLayerId, this.sceneDelta);
            if (redraw) {
                this.redrawSidebar = true;
            }
        }

        if (this.selectedArea === 2) {
            this.redrawSidebar = true;
        }

        if (this.objDragArea === 2) {
            this.redrawSidebar = true;
        }

        if (this.redrawSidebar) {
            this.drawSidebar();
            this.redrawSidebar = false;
        }

        if (this.chatLayerId === -1) {
            this.chatInterface.scrollPos = this.chatScrollHeight - this.chatScrollOffset - 77;

            if (this.mouseX > 448 && this.mouseX < 560 && this.mouseY > 332) {
                this.doScrollbar(this.mouseX - 17, this.mouseY - 357, this.chatScrollHeight, 77, false, 463, 0, this.chatInterface);
            }

            let offset: number = this.chatScrollHeight - this.chatInterface.scrollPos - 77;
            if (offset < 0) {
                offset = 0;
            }

            if (offset > this.chatScrollHeight - 77) {
                offset = this.chatScrollHeight - 77;
            }

            if (this.chatScrollOffset !== offset) {
                this.chatScrollOffset = offset;
                this.redrawChatback = true;
            }
        }

        if (this.chatLayerId !== -1) {
            let redraw = this.animateLayer(this.chatLayerId, this.sceneDelta);
            if (redraw) {
                this.redrawChatback = true;
            }
        }

        if (this.selectedArea === 3) {
            this.redrawChatback = true;
        }

        if (this.objDragArea === 3) {
            this.redrawChatback = true;
        }

        if (this.modalMessage) {
            this.redrawChatback = true;
        }

        if (this.menuVisible && this.menuArea === 2) {
            this.redrawChatback = true;
        }

        if (this.redrawChatback) {
            this.drawChat();
            this.redrawChatback = false;
        }

        if (this.sceneState === 2) {
            this.drawMinimap();
            this.areaMapback?.draw(550, 4);
        }

        if (this.flashingTab !== -1) {
            this.redrawSideicons = true;
        }

        if (this.redrawSideicons) {
            if (this.flashingTab !== -1 && this.flashingTab === this.sideTab) {
                this.flashingTab = -1;
                this.out.pIsaac(ClientProt.TUT_CLICKSIDE);
                this.out.p1(this.sideTab);
            }

            this.redrawSideicons = false;
            this.areaBackhmid1?.bind();
            this.backhmid1?.plotSprite(0, 0);

            if (this.sideLayerId === -1) {
                if (this.sideTabLayerId[this.sideTab] !== -1) {
                    if (this.sideTab === 0) {
                        this.redstone1?.plotSprite(22, 10);
                    } else if (this.sideTab === 1) {
                        this.redstone2?.plotSprite(54, 8);
                    } else if (this.sideTab === 2) {
                        this.redstone2?.plotSprite(82, 8);
                    } else if (this.sideTab === 3) {
                        this.redstone3?.plotSprite(110, 8);
                    } else if (this.sideTab === 4) {
                        this.redstone2h?.plotSprite(153, 8);
                    } else if (this.sideTab === 5) {
                        this.redstone2h?.plotSprite(181, 8);
                    } else if (this.sideTab === 6) {
                        this.redstone1h?.plotSprite(209, 9);
                    }
                }

                if (this.sideTabLayerId[0] !== -1 && (this.flashingTab !== 0 || this.loopCycle % 20 < 10)) {
                    this.sideicons[0]?.plotSprite(29, 13);
                }

                if (this.sideTabLayerId[1] !== -1 && (this.flashingTab !== 1 || this.loopCycle % 20 < 10)) {
                    this.sideicons[1]?.plotSprite(53, 11);
                }

                if (this.sideTabLayerId[2] !== -1 && (this.flashingTab !== 2 || this.loopCycle % 20 < 10)) {
                    this.sideicons[2]?.plotSprite(82, 11);
                }

                if (this.sideTabLayerId[3] !== -1 && (this.flashingTab !== 3 || this.loopCycle % 20 < 10)) {
                    this.sideicons[3]?.plotSprite(115, 12);
                }

                if (this.sideTabLayerId[4] !== -1 && (this.flashingTab !== 4 || this.loopCycle % 20 < 10)) {
                    this.sideicons[4]?.plotSprite(153, 13);
                }

                if (this.sideTabLayerId[5] !== -1 && (this.flashingTab !== 5 || this.loopCycle % 20 < 10)) {
                    this.sideicons[5]?.plotSprite(180, 11);
                }

                if (this.sideTabLayerId[6] !== -1 && (this.flashingTab !== 6 || this.loopCycle % 20 < 10)) {
                    this.sideicons[6]?.plotSprite(208, 13);
                }
            }

            this.areaBackhmid1?.draw(516, 160);

            this.areaBackbase2?.bind();
            this.backbase2?.plotSprite(0, 0);

            if (this.sideLayerId === -1) {
                if (this.sideTabLayerId[this.sideTab] !== -1) {
                    if (this.sideTab === 7) {
                        this.redstone1v?.plotSprite(42, 0);
                    } else if (this.sideTab === 8) {
                        this.redstone2v?.plotSprite(74, 0);
                    } else if (this.sideTab === 9) {
                        this.redstone2v?.plotSprite(102, 0);
                    } else if (this.sideTab === 10) {
                        this.redstone3v?.plotSprite(130, 1);
                    } else if (this.sideTab === 11) {
                        this.redstone2hv?.plotSprite(173, 0);
                    } else if (this.sideTab === 12) {
                        this.redstone2hv?.plotSprite(201, 0);
                    } else if (this.sideTab === 13) {
                        this.redstone1hv?.plotSprite(229, 0);
                    }
                }

                if (this.sideTabLayerId[8] !== -1 && (this.flashingTab !== 8 || this.loopCycle % 20 < 10)) {
                    this.sideicons[7]?.plotSprite(74, 2);
                }

                if (this.sideTabLayerId[9] !== -1 && (this.flashingTab !== 9 || this.loopCycle % 20 < 10)) {
                    this.sideicons[8]?.plotSprite(102, 3);
                }

                if (this.sideTabLayerId[10] !== -1 && (this.flashingTab !== 10 || this.loopCycle % 20 < 10)) {
                    this.sideicons[9]?.plotSprite(137, 4);
                }

                if (this.sideTabLayerId[11] !== -1 && (this.flashingTab !== 11 || this.loopCycle % 20 < 10)) {
                    this.sideicons[10]?.plotSprite(174, 2);
                }

                if (this.sideTabLayerId[12] !== -1 && (this.flashingTab !== 12 || this.loopCycle % 20 < 10)) {
                    this.sideicons[11]?.plotSprite(201, 2);
                }

                if (this.sideTabLayerId[13] !== -1 && (this.flashingTab !== 13 || this.loopCycle % 20 < 10)) {
                    this.sideicons[12]?.plotSprite(226, 2);
                }
            }

            this.areaBackbase2?.draw(496, 466);

            this.areaViewport?.bind();
        }

        if (this.redrawPrivacySettings) {
            this.redrawPrivacySettings = false;

            this.areaBackbase1?.bind();
            this.backbase1?.plotSprite(0, 0);

            this.fontPlain12?.centreStringTag(55, 28, 'Public chat', Colors.WHITE, true);
            if (this.chatPublicMode === 0) {
                this.fontPlain12?.centreStringTag(55, 41, 'On', Colors.GREEN, true);
            }
            if (this.chatPublicMode === 1) {
                this.fontPlain12?.centreStringTag(55, 41, 'Friends', Colors.YELLOW, true);
            }
            if (this.chatPublicMode === 2) {
                this.fontPlain12?.centreStringTag(55, 41, 'Off', Colors.RED, true);
            }
            if (this.chatPublicMode === 3) {
                this.fontPlain12?.centreStringTag(55, 41, 'Hide', Colors.CYAN, true);
            }

            this.fontPlain12?.centreStringTag(184, 28, 'Private chat', Colors.WHITE, true);
            if (this.chatPrivateMode === 0) {
                this.fontPlain12?.centreStringTag(184, 41, 'On', Colors.GREEN, true);
            }
            if (this.chatPrivateMode === 1) {
                this.fontPlain12?.centreStringTag(184, 41, 'Friends', Colors.YELLOW, true);
            }
            if (this.chatPrivateMode === 2) {
                this.fontPlain12?.centreStringTag(184, 41, 'Off', Colors.RED, true);
            }

            this.fontPlain12?.centreStringTag(324, 28, 'Trade/duel', Colors.WHITE, true);
            if (this.chatTradeMode === 0) {
                this.fontPlain12?.centreStringTag(324, 41, 'On', Colors.GREEN, true);
            }
            if (this.chatTradeMode === 1) {
                this.fontPlain12?.centreStringTag(324, 41, 'Friends', Colors.YELLOW, true);
            }
            if (this.chatTradeMode === 2) {
                this.fontPlain12?.centreStringTag(324, 41, 'Off', Colors.RED, true);
            }

            this.fontPlain12?.centreStringTag(458, 33, 'Report abuse', Colors.WHITE, true);

            this.areaBackbase1?.draw(0, 453);

            this.areaViewport?.bind();
        }

        this.sceneDelta = 0;
    }

    // jag::oldscape::Client::GameDrawMain
    private gameDrawMain(): void {
        this.sceneCycle++;

        this.addPlayers(true);
        this.addNpcs(true);
        this.addPlayers(false);
        this.addNpcs(false);
        this.addProjectiles();
        this.addMapAnim();

        if (!this.cinemaCam) {
            let pitch: number = this.orbitCameraPitch;
            if (((this.cameraPitchClamp / 256) | 0) > pitch) {
                pitch = (this.cameraPitchClamp / 256) | 0;
            }
            if (this.camShake[4] && this.camShakeRan[4] + 128 > pitch) {
                pitch = this.camShakeRan[4] + 128;
            }

            const yaw: number = (this.orbitCameraYaw + this.macroCameraAngle) & 0x7ff;

            if (this.localPlayer) {
                this.camFollow(this.orbitCameraX, this.getAvH(this.minusedlevel, this.localPlayer.x, this.localPlayer.z) - 50, this.orbitCameraZ, yaw, pitch, pitch * 3 + 600);
            }
        }

        let level: number;
        if (this.cinemaCam) {
            level = this.roofCheck2();
        } else {
            level = this.roofCheck();
        }

        const cinemaX: number = this.cinemaX;
        const cinemaY: number = this.cinemaY;
        const cinemaZ: number = this.cinemaZ;
        const cinemaPitch: number = this.cinemaPitch;
        const cinemaYaw: number = this.cinemaYaw;

        for (let axis: number = 0; axis < 5; axis++) {
            if (this.camShake[axis]) {
                const jitter = (Math.random() * (this.camShakeAxis[axis] * 2 + 1) - this.camShakeAxis[axis] + Math.sin(this.camShakeCycle[axis] * (this.camShakeAmp[axis] / 100.0)) * this.camShakeRan[axis]) | 0;

                if (axis === 0) {
                    this.cinemaX += jitter;
                } else if (axis === 1) {
                    this.cinemaY += jitter;
                } else if (axis === 2) {
                    this.cinemaZ += jitter;
                } else if (axis === 3) {
                    this.cinemaYaw = (this.cinemaYaw + jitter) & 0x7ff;
                } else if (axis === 4) {
                    this.cinemaPitch += jitter;

                    if (this.cinemaPitch < 128) {
                        this.cinemaPitch = 128;
                    }

                    if (this.cinemaPitch > 383) {
                        this.cinemaPitch = 383;
                    }
                }
            }
        }

        const cycle = Pix3D.cycle;
        Model.checkHover = true;
        Model.pickedCount = 0;
        Model.mouseX = this.mouseX - 4;
        Model.mouseY = this.mouseY - 4;

        Pix2D.cls();
        this.world?.renderAll(this.cinemaX, this.cinemaY, this.cinemaZ, level, this.cinemaYaw, this.cinemaPitch, this.loopCycle);
        this.world?.removeSprites();
        this.entityOverlays();
        this.coordArrow();
        this.textureRunAnims(cycle);
        this.otherOverlays();
        this.areaViewport?.draw(4, 4);

        this.cinemaX = cinemaX;
        this.cinemaY = cinemaY;
        this.cinemaZ = cinemaZ;
        this.cinemaPitch = cinemaPitch;
        this.cinemaYaw = cinemaYaw;
    }

    // jag::oldscape::Client::GdmAddPlayerToWorld
    private addPlayers(self: boolean): void {
        if (!this.localPlayer) {
            return;
        }

        if (this.localPlayer.x >> 7 === this.flagTileX && this.localPlayer.z >> 7 === this.flagTileZ) {
            this.flagTileX = 0;

            Client.cyclelogic6++;
            if (Client.cyclelogic6 > 122) {
                Client.cyclelogic6 = 0;

                this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC6);
                this.out.p1(62);
            }
        }

        let count = this.playerCount;
        if (self) {
            count = 1;
        }

        for (let i: number = 0; i < count; i++) {
            let player: ClientPlayer | null;
            let id: number;
            if (self) {
                player = this.localPlayer;
                id = Constants.LOCAL_PLAYER_INDEX << 14;
            } else {
                player = this.players[this.playerIds[i]];
                id = this.playerIds[i] << 14;
            }

            if (!player || !player.isReady()) {
                continue;
            }

            player.lowMemory = false;
            if ((Client.lowMem && this.playerCount > 50 || this.playerCount > 200) && !self && player.secondarySeqId == player.readyanim) {
                player.lowMemory = true;
            }

            const stx: number = player.x >> 7;
            const stz: number = player.z >> 7;

            if (stx < 0 || stx >= CollisionConstants.SIZE || stz < 0 || stz >= CollisionConstants.SIZE) {
                continue;
            }

            if (!player.locModel || this.loopCycle < player.locStartCycle || this.loopCycle >= player.locStopCycle) {
                if ((player.x & 0x7f) === 64 && (player.z & 0x7f) === 64) {
                    if (this.tileLastOccupiedCycle[stx][stz] == this.sceneCycle && i != -1) {
                        continue;
                    }

                    this.tileLastOccupiedCycle[stx][stz] = this.sceneCycle;
                }

                player.y = this.getAvH(this.minusedlevel, player.x, player.z);
                this.world?.addDynamic(this.minusedlevel, player.x, player.y, player.z, player, id, player.yaw, 60, player.needsForwardDrawPadding);
            } else {
                player.lowMemory = false;
                player.y = this.getAvH(this.minusedlevel, player.x, player.z);
                this.world?.addDynamic2(this.minusedlevel, player.x, player.y, player.z, player.minTileX, player.minTileZ, player.maxTileX, player.maxTileZ, player, id, player.yaw);
            }
        }
    }

    // jag::oldscape::Client::GdmAddNPCs
    private addNpcs(alwaysontop: boolean): void {
        for (let i: number = 0; i < this.npcCount; i++) {
            const npc: ClientNpc | null = this.npc[this.npcIds[i]];
            const typecode: number = ((this.npcIds[i] << 14) + 0x20000000) | 0;

            if (!npc || !npc.isReady() || npc.type?.alwaysontop !== alwaysontop) {
                continue;
            }

            const x: number = npc.x >> 7;
            const z: number = npc.z >> 7;

            if (x < 0 || x >= CollisionConstants.SIZE || z < 0 || z >= CollisionConstants.SIZE) {
                continue;
            }

            if (npc.size === 1 && (npc.x & 0x7f) === 64 && (npc.z & 0x7f) === 64) {
                if (this.tileLastOccupiedCycle[x][z] === this.sceneCycle) {
                    continue;
                }

                this.tileLastOccupiedCycle[x][z] = this.sceneCycle;
            }

            this.world?.addDynamic(this.minusedlevel, npc.x, this.getAvH(this.minusedlevel, npc.x, npc.z), npc.z, npc, typecode, npc.yaw, (npc.size - 1) * 64 + 60, npc.needsForwardDrawPadding);
        }
    }

    // jag::oldscape::Client::GdmAddProjectiles
    private addProjectiles(): void {
        for (let proj: ClientProj | null = this.projectiles.head() as ClientProj | null; proj; proj = this.projectiles.next() as ClientProj | null) {
            if (proj.level !== this.minusedlevel || this.loopCycle > proj.t2) {
                proj.unlink();
            } else if (this.loopCycle >= proj.t1) {
                if (proj.targetEntity > 0) {
                    const npc: ClientNpc | null = this.npc[proj.targetEntity - 1];
                    if (npc) {
                        proj.setTarget(npc.x, this.getAvH(proj.level, npc.x, npc.z) - proj.h2, npc.z, this.loopCycle);
                    }
                }

                if (proj.targetEntity < 0) {
                    const index: number = -proj.targetEntity - 1;
                    let player: ClientPlayer | null;
                    if (index === this.localPid) {
                        player = this.localPlayer;
                    } else {
                        player = this.players[index];
                    }

                    if (player) {
                        proj.setTarget(player.x, this.getAvH(proj.level, player.x, player.z) - proj.h2, player.z, this.loopCycle);
                    }
                }

                proj.move(this.sceneDelta);
                this.world?.addDynamic(this.minusedlevel, proj.x | 0, proj.y | 0, proj.z | 0, proj, -1, proj.yaw, 60, false);
            }
        }

        Client.cyclelogic1++;
        if (Client.cyclelogic1 > 1174) {
            Client.cyclelogic1 = 0;

            this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC1);
            this.out.p1(0);
            const start = this.out.pos;
            if (((Math.random() * 2.0) | 0) === 0) {
                this.out.p2(11499);
            }
            this.out.p2(10548);
            if (((Math.random() * 2.0) | 0) == 0) {
                this.out.p1(139);
            }
            if (((Math.random() * 2.0) | 0) == 0) {
                this.out.p1(94);
            }
            this.out.p2(51693);
            this.out.p1(16);
            this.out.p2(15036);
            if (((Math.random() * 2.0) | 0) == 0) {
                this.out.p1(65);
            }
            this.out.p1((Math.random() * 256.0) | 0);
            this.out.p2(22990);
            this.out.psize1(this.out.pos - start);
        }
    }

    // jag::oldscape::Client::GdmAddMapAnim
    private addMapAnim(): void {
        for (let spot: MapSpotAnim | null = this.spotanims.head() as MapSpotAnim | null; spot; spot = this.spotanims.next() as MapSpotAnim | null) {
            if (spot.level !== this.minusedlevel || spot.seqComplete) {
                spot.unlink();
            } else if (this.loopCycle >= spot.startCycle) {
                spot.update(this.sceneDelta);

                if (spot.seqComplete) {
                    spot.unlink();
                } else {
                    this.world?.addDynamic(spot.level, spot.x, spot.y, spot.z, spot, -1, 0, 60, false);
                }
            }
        }
    }

    // jag::oldscape::Client::CamFollow
    private camFollow(targetX: number, targetY: number, targetZ: number, yaw: number, pitch: number, distance: number): void {
        const invPitch: number = (2048 - pitch) & 0x7ff;
        const invYaw: number = (2048 - yaw) & 0x7ff;

        let x: number = 0;
        let y: number = 0;
        let z: number = distance;

        let sin: number;
        let cos: number;
        let tmp: number;

        if (invPitch !== 0) {
            sin = Pix3D.sinTable[invPitch];
            cos = Pix3D.cosTable[invPitch];
            tmp = (y * cos - distance * sin) >> 16;
            z = (y * sin + distance * cos) >> 16;
            y = tmp;
        }

        if (invYaw !== 0) {
            sin = Pix3D.sinTable[invYaw];
            cos = Pix3D.cosTable[invYaw];
            tmp = (z * sin + x * cos) >> 16;
            z = (z * cos - x * sin) >> 16;
            x = tmp;
        }

        this.cinemaX = targetX - x;
        this.cinemaY = targetY - y;
        this.cinemaZ = targetZ - z;
        this.cinemaPitch = pitch;
        this.cinemaYaw = yaw;
    }

    // jag::oldscape::Client::GdmRoofCheck2
    private roofCheck2(): number {
        if (!this.mapl) {
            return 0; // custom
        }

        const y: number = this.getAvH(this.minusedlevel, this.cinemaX, this.cinemaZ);
        return y - this.cinemaY >= 800 || (this.mapl[this.minusedlevel][this.cinemaX >> 7][this.cinemaZ >> 7] & MapFlag.RemoveRoof) === 0 ? 3 : this.minusedlevel;
    }

    // jag::oldscape::Client::GdmRoofCheck
    private roofCheck(): number {
        let top: number = 3;

        if (this.cinemaPitch < 310 && this.localPlayer) {
            let cameraLocalTileX: number = this.cinemaX >> 7;
            let cameraLocalTileZ: number = this.cinemaZ >> 7;
            const playerLocalTileX: number = this.localPlayer.x >> 7;
            const playerLocalTileZ: number = this.localPlayer.z >> 7;

            if (this.mapl && (this.mapl[this.minusedlevel][cameraLocalTileX][cameraLocalTileZ] & MapFlag.RemoveRoof) !== 0) {
                top = this.minusedlevel;
            }

            let tileDeltaX: number;
            if (playerLocalTileX > cameraLocalTileX) {
                tileDeltaX = playerLocalTileX - cameraLocalTileX;
            } else {
                tileDeltaX = cameraLocalTileX - playerLocalTileX;
            }

            let tileDeltaZ: number;
            if (playerLocalTileZ > cameraLocalTileZ) {
                tileDeltaZ = playerLocalTileZ - cameraLocalTileZ;
            } else {
                tileDeltaZ = cameraLocalTileZ - playerLocalTileZ;
            }

            if (tileDeltaX > tileDeltaZ) {
                let delta = ((tileDeltaZ * 65536) / tileDeltaX) | 0;
                let accumulator = 32768;

                while (cameraLocalTileX !== playerLocalTileX) {
                    if (cameraLocalTileX < playerLocalTileX) {
                        cameraLocalTileX++;
                    } else if (cameraLocalTileX > playerLocalTileX) {
                        cameraLocalTileX--;
                    }

                    if (this.mapl && (this.mapl[this.minusedlevel][cameraLocalTileX][cameraLocalTileZ] & MapFlag.RemoveRoof) !== 0) {
                        top = this.minusedlevel;
                    }

                    accumulator += delta;
                    if (accumulator >= 65536) {
                        accumulator -= 65536;

                        if (cameraLocalTileZ < playerLocalTileZ) {
                            cameraLocalTileZ++;
                        } else if (cameraLocalTileZ > playerLocalTileZ) {
                            cameraLocalTileZ--;
                        }

                        if (this.mapl && (this.mapl[this.minusedlevel][cameraLocalTileX][cameraLocalTileZ] & MapFlag.RemoveRoof) !== 0) {
                            top = this.minusedlevel;
                        }
                    }
                }
            } else {
                let delta = ((tileDeltaX * 65536) / tileDeltaZ) | 0;
                let accumulator = 32768;

                while (cameraLocalTileZ !== playerLocalTileZ) {
                    if (cameraLocalTileZ < playerLocalTileZ) {
                        cameraLocalTileZ++;
                    } else if (cameraLocalTileZ > playerLocalTileZ) {
                        cameraLocalTileZ--;
                    }

                    if (this.mapl && (this.mapl[this.minusedlevel][cameraLocalTileX][cameraLocalTileZ] & MapFlag.RemoveRoof) !== 0) {
                        top = this.minusedlevel;
                    }

                    accumulator += delta;
                    if (accumulator >= 65536) {
                        accumulator -= 65536;

                        if (cameraLocalTileX < playerLocalTileX) {
                            cameraLocalTileX++;
                        } else if (cameraLocalTileX > playerLocalTileX) {
                            cameraLocalTileX--;
                        }

                        if (this.mapl && (this.mapl[this.minusedlevel][cameraLocalTileX][cameraLocalTileZ] & MapFlag.RemoveRoof) !== 0) {
                            top = this.minusedlevel;
                        }
                    }
                }
            }
        }

        if (this.localPlayer && this.mapl && (this.mapl[this.minusedlevel][this.localPlayer.x >> 7][this.localPlayer.z >> 7] & MapFlag.RemoveRoof) !== 0) {
            top = this.minusedlevel;
        }

        return top;
    }

    // jag::oldscape::Client::GdmEntityOverlays
    private entityOverlays(): void {
        this.chatCount = 0;

        for (let index: number = -1; index < this.playerCount + this.npcCount; index++) {
            let entity: ClientEntity | null = null;
            if (index === -1) {
                entity = this.localPlayer;
            } else if (index < this.playerCount) {
                entity = this.players[this.playerIds[index]];
            } else {
                entity = this.npc[this.npcIds[index - this.playerCount]];
            }

            if (!entity || !entity.isReady()) {
                continue;
            }

            if (index >= this.playerCount) {
                const npc = (entity as ClientNpc).type;

                if (npc && npc.headicon >= 0 && npc.headicon < this.headicons.length) {
                    this.getOverlayPosEntity(entity, entity.height + 15);

                    if (this.projectX > -1) {
                        this.headicons[npc.headicon]?.plotSprite(this.projectX - 12, this.projectY - 30);
                    }
                }

                if (this.hintType === 1 && this.hintNpc === this.npcIds[index - this.playerCount] && this.loopCycle % 20 < 10) {
                    this.getOverlayPosEntity(entity, entity.height + 15);

                    if (this.projectX > -1) {
                        this.headicons[2]?.plotSprite(this.projectX - 12, this.projectY - 28);
                    }
                }
            } else {
                let y: number = 30;

                const player: ClientPlayer = entity as ClientPlayer;
                if (player.headicons !== 0) {
                    this.getOverlayPosEntity(entity, entity.height + 15);

                    if (this.projectX > -1) {
                        for (let icon: number = 0; icon < 8; icon++) {
                            if ((player.headicons & (0x1 << icon)) !== 0) {
                                this.headicons[icon]?.plotSprite(this.projectX - 12, this.projectY - y);
                                y -= 25;
                            }
                        }
                    }
                }

                if (index >= 0 && this.hintType === 10 && this.hintPlayer === this.playerIds[index]) {
                    this.getOverlayPosEntity(entity, entity.height + 15);

                    if (this.projectX > -1) {
                        this.headicons[7]?.plotSprite(this.projectX - 12, this.projectY - y);
                    }
                }
            }

            if (entity.chatMessage && (index >= this.playerCount || this.chatPublicMode === 0 || this.chatPublicMode === 3 || (this.chatPublicMode === 1 && this.isFriend((entity as ClientPlayer).name)))) {
                this.getOverlayPosEntity(entity, entity.height);

                if (this.projectX > -1 && this.chatCount < Constants.MAX_CHATS && this.fontBold12) {
                    this.chatWidth[this.chatCount] = (this.fontBold12.stringWid(entity.chatMessage) / 2) | 0;
                    this.chatHeight[this.chatCount] = this.fontBold12.height2d;
                    this.chatX[this.chatCount] = this.projectX;
                    this.chatY[this.chatCount] = this.projectY;

                    this.chatColors[this.chatCount] = entity.chatColour;
                    this.chatEffect[this.chatCount] = entity.chatEffect;
                    this.chatTimers[this.chatCount] = entity.chatTimer;
                    this.chats[this.chatCount++] = entity.chatMessage as string;

                    if (this.chatEffects === 0 && entity.chatEffect === 1) {
                        this.chatHeight[this.chatCount] += 10;
                        this.chatY[this.chatCount] += 5;
                    }

                    if (this.chatEffects === 0 && entity.chatEffect === 2) {
                        this.chatWidth[this.chatCount] = 60;
                    }
                }
            }

            if (entity.combatCycle > this.loopCycle + 100) {
                this.getOverlayPosEntity(entity, entity.height + 15);

                if (this.projectX > -1) {
                    let w: number = ((entity.health * 30) / entity.totalHealth) | 0;
                    if (w > 30) {
                        w = 30;
                    }
                    Pix2D.fillRect(this.projectX - 15, this.projectY - 3, w, 5, Colors.GREEN);
                    Pix2D.fillRect(this.projectX - 15 + w, this.projectY - 3, 30 - w, 5, Colors.RED);
                }
            }

            for (let i = 0; i < 4; ++i) {
                if (entity.damageCycles[i] > this.loopCycle) {
                    this.getOverlayPosEntity(entity, (entity.height / 2) | 0);

                    if (this.projectX <= -1) {
                        continue;
                    }

                    if (i == 1) {
                        this.projectY -= 20;
                    } else if (i == 2) {
                        this.projectX -= 15;
                        this.projectY -= 10;
                    } else if (i == 3) {
                        this.projectX += 15;
                        this.projectY -= 10;
                    }

                    this.hitmarks[entity.damageTypes[i]]?.plotSprite(this.projectX - 12, this.projectY - 12);
                    this.fontPlain11?.centreString(this.projectX, this.projectY + 4, entity.damageValues[i].toString(), Colors.BLACK);
                    this.fontPlain11?.centreString(this.projectX - 1, this.projectY + 3, entity.damageValues[i].toString(), Colors.WHITE);
                }
            }
        }

        for (let i: number = 0; i < this.chatCount; i++) {
            const x: number = this.chatX[i];
            let y: number = this.chatY[i];
            const padding: number = this.chatWidth[i];
            const height: number = this.chatHeight[i];

            let sorting: boolean = true;
            while (sorting) {
                sorting = false;
                for (let j: number = 0; j < i; j++) {
                    if (y + 2 > this.chatY[j] - this.chatHeight[j] && y - height < this.chatY[j] + 2 && x - padding < this.chatX[j] + this.chatWidth[j] && x + padding > this.chatX[j] - this.chatWidth[j] && this.chatY[j] - this.chatHeight[j] < y) {
                        y = this.chatY[j] - this.chatHeight[j];
                        sorting = true;
                    }
                }
            }

            this.projectX = this.chatX[i];
            this.projectY = this.chatY[i] = y;

            const message: string | null = this.chats[i];
            if (this.chatEffects === 0) {
                let color: number = Colors.YELLOW;

                if (this.chatColors[i] < 6) {
                    color = Client.CHAT_COLORS[this.chatColors[i]];
                } else if (this.chatColors[i] === 6) {
                    color = this.sceneCycle % 20 < 10 ? Colors.RED : Colors.YELLOW;
                } else if (this.chatColors[i] === 7) {
                    color = this.sceneCycle % 20 < 10 ? Colors.BLUE : Colors.CYAN;
                } else if (this.chatColors[i] === 8) {
                    color = this.sceneCycle % 20 < 10 ? 0xb000 : 0x80ff80;
                } else if (this.chatColors[i] === 9) {
                    const delta: number = 150 - this.chatTimers[i];
                    if (delta < 50) {
                        color = delta * 1280 + Colors.RED;
                    } else if (delta < 100) {
                        color = Colors.YELLOW - (delta - 50) * 327680;
                    } else if (delta < 150) {
                        color = (delta - 100) * 5 + Colors.GREEN;
                    }
                } else if (this.chatColors[i] === 10) {
                    const delta: number = 150 - this.chatTimers[i];
                    if (delta < 50) {
                        color = delta * 5 + Colors.RED;
                    } else if (delta < 100) {
                        color = Colors.MAGENTA - (delta - 50) * 327680;
                    } else if (delta < 150) {
                        color = (delta - 100) * 327680 + Colors.BLUE - (delta - 100) * 5;
                    }
                }
                if (this.chatColors[i] === 11) {
                    const delta: number = 150 - this.chatTimers[i];
                    if (delta < 50) {
                        color = Colors.WHITE - delta * 327685;
                    } else if (delta < 100) {
                        color = (delta - 50) * 327685 + Colors.GREEN;
                    } else if (delta < 150) {
                        color = Colors.WHITE - (delta - 100) * 327680;
                    }
                }

                if (this.chatEffect[i] === 0) {
                    this.fontBold12?.centreString(this.projectX, this.projectY + 1, message, Colors.BLACK);
                    this.fontBold12?.centreString(this.projectX, this.projectY, message, color);
                } else if (this.chatEffect[i] === 1) {
                    this.fontBold12?.centerStringWave(this.projectX, this.projectY + 1, message, Colors.BLACK, this.sceneCycle);
                    this.fontBold12?.centerStringWave(this.projectX, this.projectY, message, color, this.sceneCycle);
                } else if (this.chatEffect[i] === 2) {
                    const w: number = this.fontBold12?.stringWid(message) ?? 0;
                    const offsetX: number = ((150 - this.chatTimers[i]) * (w + 100)) / 150;
                    Pix2D.setClipping(this.projectX - 50, 0, this.projectX + 50, 334);
                    this.fontBold12?.drawString(this.projectX + 50 - offsetX, this.projectY + 1, message, Colors.BLACK);
                    this.fontBold12?.drawString(this.projectX + 50 - offsetX, this.projectY, message, color);
                    Pix2D.resetClipping();
                }
            } else {
                this.fontBold12?.centreString(this.projectX, this.projectY + 1, message, Colors.BLACK);
                this.fontBold12?.centreString(this.projectX, this.projectY, message, Colors.YELLOW);
            }
        }
    }

    // jag::oldscape::Client::GdmCoordArrow
    private coordArrow(): void {
        if (this.hintType !== 2 || !this.headicons[2]) {
            return;
        }

        this.getOverlayPos(((this.hintTileX - this.mapBuildBaseX) << 7) + this.hintOffsetX, this.hintHeight * 2, ((this.hintTileZ - this.mapBuildBaseZ) << 7) + this.hintOffsetZ);

        if (this.projectX > -1 && this.loopCycle % 20 < 10) {
            this.headicons[2].plotSprite(this.projectX - 12, this.projectY - 28);
        }
    }

    // jag::oldscape::Client::GetOverlayPos
    private getOverlayPosEntity(entity: ClientEntity, height: number): void {
        this.getOverlayPos(entity.x, height, entity.z);
    }

    // jag::oldscape::Client::GetOverlayPos
    private getOverlayPos(x: number, height: number, z: number): void {
        if (x < 128 || z < 128 || x > 13056 || z > 13056) {
            this.projectX = -1;
            this.projectY = -1;
            return;
        }

        const y: number = this.getAvH(this.minusedlevel, x, z) - height;

        let dx: number = x - this.cinemaX;
        let dy: number = y - this.cinemaY;
        let dz: number = z - this.cinemaZ;

        const sinPitch: number = Pix3D.sinTable[this.cinemaPitch];
        const cosPitch: number = Pix3D.cosTable[this.cinemaPitch];
        const sinYaw: number = Pix3D.sinTable[this.cinemaYaw];
        const cosYaw: number = Pix3D.cosTable[this.cinemaYaw];

        let tmp: number = (dz * sinYaw + dx * cosYaw) >> 16;
        dz = (dz * cosYaw - dx * sinYaw) >> 16;
        dx = tmp;

        tmp = (dy * cosPitch - dz * sinPitch) >> 16;
        dz = (dy * sinPitch + dz * cosPitch) >> 16;
        dy = tmp;

        if (dz >= 50) {
            this.projectX = Pix3D.projectionX + (((dx << 9) / dz) | 0);
            this.projectY = Pix3D.projectionY + (((dy << 9) / dz) | 0);
        } else {
            this.projectX = -1;
            this.projectY = -1;
        }
    }

    // jag::oldscape::Client::GetAvH
    private getAvH(level: number, sceneX: number, sceneZ: number): number {
        if (!this.groundh) {
            return 0; // custom
        }

        const tileX: number = sceneX >> 7;
        const tileZ: number = sceneZ >> 7;

        if (tileX < 0 || tileZ < 0 || tileX > 103 || tileZ > 103) {
            return 0;
        }

        let realLevel: number = level;
        if (level < 3 && this.mapl && (this.mapl[1][tileX][tileZ] & MapFlag.LinkBelow) !== 0) {
            realLevel = level + 1;
        }

        const tileLocalX: number = sceneX & 0x7f;
        const tileLocalZ: number = sceneZ & 0x7f;
        const y00: number = (this.groundh[realLevel][tileX][tileZ] * (128 - tileLocalX) + this.groundh[realLevel][tileX + 1][tileZ] * tileLocalX) >> 7;
        const y11: number = (this.groundh[realLevel][tileX][tileZ + 1] * (128 - tileLocalX) + this.groundh[realLevel][tileX + 1][tileZ + 1] * tileLocalX) >> 7;
        return (y00 * (128 - tileLocalZ) + y11 * tileLocalZ) >> 7;
    }

    // jag::oldscape::dash3d::TextureCache::RunAnims
    private textureRunAnims(cycle: number): void {
        if (!Client.lowMem) {
            if (Pix3D.textureCycle[17] >= cycle) {
                const texture: Pix8 | null = Pix3D.textures[17];
                if (!texture) {
                    return;
                }

                const bottom: number = texture.wi * texture.hi - 1;
                const adjustment: number = texture.wi * this.sceneDelta * 2;

                const src: Int8Array = texture.data;
                const dst: Int8Array = this.textureBuffer;
                for (let i: number = 0; i <= bottom; i++) {
                    dst[i] = src[(i - adjustment) & bottom];
                }

                texture.data = dst;
                this.textureBuffer = src;
                Pix3D.pushTexture(17);
            }

            if (Pix3D.textureCycle[24] >= cycle) {
                const texture: Pix8 | null = Pix3D.textures[24];
                if (!texture) {
                    return;
                }
                const bottom: number = texture.wi * texture.hi - 1;
                const adjustment: number = texture.wi * this.sceneDelta * 2;

                const src: Int8Array = texture.data;
                const dst: Int8Array = this.textureBuffer;
                for (let i: number = 0; i <= bottom; i++) {
                    dst[i] = src[(i - adjustment) & bottom];
                }

                texture.data = dst;
                this.textureBuffer = src;
                Pix3D.pushTexture(24);
            }
        }
    }

    // jag::oldscape::Client::GdmOtherOverlays
    private otherOverlays(): void {
        this.drawPrivateMessages();

        if (this.crossMode === 1) {
            this.cross[(this.crossCycle / 100) | 0]?.plotSprite(this.crossX - 8 - 4, this.crossY - 8 - 4);
        } else if (this.crossMode === 2) {
            this.cross[((this.crossCycle / 100) | 0) + 4]?.plotSprite(this.crossX - 8 - 4, this.crossY - 8 - 4);

            Client.cyclelogic5++;
            if (Client.cyclelogic5 > 57) {
                Client.cyclelogic5 = 0;

                this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC5);
            }
        }

        if (this.mainOverlayLayerId !== -1) {
            this.animateLayer(this.mainOverlayLayerId, this.sceneDelta);
            this.drawLayer(IfType.list[this.mainOverlayLayerId], 0, 0, 0);
        }

        if (this.mainLayerId !== -1) {
            this.animateLayer(this.mainLayerId, this.sceneDelta);
            this.drawLayer(IfType.list[this.mainLayerId], 0, 0, 0);
        }

        this.getSpecialArea();

        if (!this.menuVisible) {
            this.handleInput();
            this.drawTooltip();
        } else if (this.menuArea === 0) {
            this.drawMenu();
        }

        if (this.inMultizone === 1) {
            this.headicons[1]?.plotSprite(472, 296);
        }

        if (this.displayFps) {
            let x: number = 507;
            let y: number = 20;

            let color: number = Colors.YELLOW;
            if (this.fps < 15) {
                color = Colors.RED;
            }

            this.fontPlain12?.drawStringRight(x, y, 'Fps:' + this.fps, color);
            y += 15;

            let memoryUsage = -1;
            if (typeof window.performance['memory' as keyof Performance] !== 'undefined') {
                const memory = window.performance['memory' as keyof Performance] as any;
                memoryUsage = (memory.usedJSHeapSize / 1024) | 0;
            }

            if (memoryUsage !== -1) {
                this.fontPlain12?.drawStringRight(x, y, 'Mem:' + memoryUsage + 'k', Colors.YELLOW);
            }
        }

        if (this.systemUpdateTimer !== 0) {
            let seconds: number = (this.systemUpdateTimer / 50) | 0;
            const minutes: number = (seconds / 60) | 0;
            seconds %= 60;

            if (seconds < 10) {
                this.fontPlain12?.drawString(4, 329, 'System update in: ' + minutes + ':0' + seconds, Colors.YELLOW);
            } else {
                this.fontPlain12?.drawString(4, 329, 'System update in: ' + minutes + ':' + seconds, Colors.YELLOW);
            }
        }
    }

    private drawPrivateMessages(): void {
        if (this.splitPrivateChat === 0) {
            return;
        }

        const font: PixFont | null = this.fontPlain12;
        let lineOffset: number = 0;
        if (this.systemUpdateTimer !== 0) {
            lineOffset = 1;
        }

        for (let i: number = 0; i < 100; i++) {
            if (!this.messageText[i]) {
                continue;
            }

            const type: number = this.messageType[i];
            let sender = this.messageSender[i];

            let modlevel = 0;
            if (sender && sender.startsWith('@cr1@')) {
                sender = sender.substring(5);
                modlevel = 1;
            } else if (sender && sender.startsWith('@cr2@')) {
                sender = sender.substring(5);
                modlevel = 2;
            }

            if ((type == 3 || type == 7) && (type == 7 || this.chatPrivateMode == 0 || this.chatPrivateMode == 1 && this.isFriend(sender))) {
                const y = 329 - lineOffset * 13;
                let x = 4;

                font?.drawString(4, y, 'From', Colors.BLACK);
                font?.drawString(4, y - 1, 'From', Colors.CYAN);
                x += font?.stringWid('From ') ?? 0;

                if (modlevel == 1) {
                    this.modIcons[0].plotSprite(x, y - 12);
                    x += 14;
                } else if (modlevel == 2) {
                    this.modIcons[1].plotSprite(x, y - 12);
                    x += 14;
                }

                font?.drawString(x, y, sender + ': ' + this.messageText[i], Colors.BLACK);
                font?.drawString(x, y - 1, sender + ': ' + this.messageText[i], Colors.CYAN);

                lineOffset++;
                if (lineOffset >= 5) {
                    return;
                }
            } else if (type === 5 && this.chatPrivateMode < 2) {
                const y = 329 - lineOffset * 13;

                font?.drawString(4, y, this.messageText[i], Colors.BLACK);
                font?.drawString(4, y - 1, this.messageText[i], Colors.CYAN);

                lineOffset++;
                if (lineOffset >= 5) {
                    return;
                }
            } else if (type === 6 && this.chatPrivateMode < 2) {
                const y = 329 - lineOffset * 13;

                font?.drawString(4, y, 'To ' + sender + ': ' + this.messageText[i], Colors.BLACK);
                font?.drawString(4, y - 1, 'To ' + sender + ': ' + this.messageText[i], Colors.CYAN);

                lineOffset++;
                if (lineOffset >= 5) {
                    return;
                }
            }
        }
    }

    // jag::oldscape::Client::GdmGetSpecialArea
    private getSpecialArea(): void {
        if (!this.localPlayer) {
            return;
        }

        const x: number = (this.localPlayer.x >> 7) + this.mapBuildBaseX;
        const z: number = (this.localPlayer.z >> 7) + this.mapBuildBaseZ;

        this.chatDisabled = 0;

        // tutorial island
        if (x >= 3053 && x <= 3156 && z >= 3056 && z <= 3136) {
            this.chatDisabled = 1;
        } else if (x >= 3072 && x <= 3118 && z >= 9492 && z <= 9535) {
            this.chatDisabled = 1;
        }

        if (this.chatDisabled === 1 && x >= 3139 && x <= 3199 && z >= 3008 && z <= 3062) {
            this.chatDisabled = 0;
        }
    }

    private drawTooltip(): void {
        if (this.menuSize < 2 && this.objSelected === 0 && this.spellSelected === 0) {
            return;
        }

        let tooltip: string;
        if (this.objSelected === 1 && this.menuSize < 2) {
            tooltip = 'Use ' + this.objSelectedName + ' with...';
        } else if (this.spellSelected === 1 && this.menuSize < 2) {
            tooltip = this.spellCaption + '...';
        } else {
            tooltip = this.menuOption[this.menuSize - 1];
        }

        if (this.menuSize > 2) {
            tooltip = tooltip + '@whi@ / ' + (this.menuSize - 2) + ' more options';
        }

        this.fontBold12?.drawStringAntiMacro(4, 15, tooltip, Colors.WHITE, true, (this.loopCycle / 1000) | 0);
    }

    private drawMenu(): void {
        const x: number = this.menuX;
        const y: number = this.menuY;
        const w: number = this.menuWidth;
        const h: number = this.menuHeight;
        const background: number = Colors.OPTIONS_MENU;

        Pix2D.fillRect(x, y, w, h, background);
        Pix2D.fillRect(x + 1, y + 1, w - 2, 16, Colors.BLACK);
        Pix2D.drawRect(x + 1, y + 18, w - 2, h - 19, Colors.BLACK);

        this.fontBold12?.drawString(x + 3, y + 14, 'Choose Option', background);

        let mouseX: number = this.mouseX;
        let mouseY: number = this.mouseY;
        if (this.menuArea === 0) {
            mouseX -= 4;
            mouseY -= 4;
        } else if (this.menuArea === 1) {
            mouseX -= 553;
            mouseY -= 205;
        } else if (this.menuArea === 2) {
            mouseX -= 17;
            mouseY -= 357;
        }

        for (let i: number = 0; i < this.menuSize; i++) {
            const optionY: number = y + (this.menuSize - 1 - i) * 15 + 31;

            let rgb: number = Colors.WHITE;
            if (mouseX > x && mouseX < x + w && mouseY > optionY - 13 && mouseY < optionY + 3) {
                rgb = Colors.YELLOW;
            }

            this.fontBold12?.drawStringTag(x + 3, optionY, this.menuOption[i], rgb, true);
        }
    }

    // jag::oldscape::minimap::Minimap::DrawDetail
    private drawDetail(tileX: number, tileZ: number, level: number, wallRgb: number, doorRgb: number): void {
        if (!this.world || !this.minimap) {
            return;
        }

        let typecode: number = this.world.wallType(level, tileX, tileZ);
        if (typecode !== 0) {
            const info: number = this.world.typecode2(level, tileX, tileZ, typecode);
            const angle: number = (info >> 6) & 0x3;
            const shape: number = info & 0x1f;
            let rgb: number = wallRgb;
            if (typecode > 0) {
                rgb = doorRgb;
            }

            const dst: Int32Array = this.minimap.data;
            const offset: number = tileX * 4 + (103 - tileZ) * 512 * 4 + 24624;
            const locId: number = (typecode >> 14) & 0x7fff;

            const loc: LocType = LocType.get(locId);
            if (loc.mapscene === -1) {
                if (shape === LocShape.WALL_STRAIGHT.id || shape === LocShape.WALL_L.id) {
                    if (angle === LocAngle.WEST) {
                        dst[offset] = rgb;
                        dst[offset + 512] = rgb;
                        dst[offset + 1024] = rgb;
                        dst[offset + 1536] = rgb;
                    } else if (angle === LocAngle.NORTH) {
                        dst[offset] = rgb;
                        dst[offset + 1] = rgb;
                        dst[offset + 2] = rgb;
                        dst[offset + 3] = rgb;
                    } else if (angle === LocAngle.EAST) {
                        dst[offset + 3] = rgb;
                        dst[offset + 3 + 512] = rgb;
                        dst[offset + 3 + 1024] = rgb;
                        dst[offset + 3 + 1536] = rgb;
                    } else if (angle === LocAngle.SOUTH) {
                        dst[offset + 1536] = rgb;
                        dst[offset + 1536 + 1] = rgb;
                        dst[offset + 1536 + 2] = rgb;
                        dst[offset + 1536 + 3] = rgb;
                    }
                }

                if (shape === LocShape.WALL_SQUARE_CORNER.id) {
                    if (angle === LocAngle.WEST) {
                        dst[offset] = rgb;
                    } else if (angle === LocAngle.NORTH) {
                        dst[offset + 3] = rgb;
                    } else if (angle === LocAngle.EAST) {
                        dst[offset + 3 + 1536] = rgb;
                    } else if (angle === LocAngle.SOUTH) {
                        dst[offset + 1536] = rgb;
                    }
                }

                if (shape === LocShape.WALL_L.id) {
                    if (angle === LocAngle.SOUTH) {
                        dst[offset] = rgb;
                        dst[offset + 512] = rgb;
                        dst[offset + 1024] = rgb;
                        dst[offset + 1536] = rgb;
                    } else if (angle === LocAngle.WEST) {
                        dst[offset] = rgb;
                        dst[offset + 1] = rgb;
                        dst[offset + 2] = rgb;
                        dst[offset + 3] = rgb;
                    } else if (angle === LocAngle.NORTH) {
                        dst[offset + 3] = rgb;
                        dst[offset + 3 + 512] = rgb;
                        dst[offset + 3 + 1024] = rgb;
                        dst[offset + 3 + 1536] = rgb;
                    } else if (angle === LocAngle.EAST) {
                        dst[offset + 1536] = rgb;
                        dst[offset + 1536 + 1] = rgb;
                        dst[offset + 1536 + 2] = rgb;
                        dst[offset + 1536 + 3] = rgb;
                    }
                }
            } else {
                const scene: Pix8 | null = this.mapscene[loc.mapscene];
                if (scene) {
                    const offsetX: number = ((loc.width * 4 - scene.wi) / 2) | 0;
                    const offsetY: number = ((loc.length * 4 - scene.hi) / 2) | 0;
                    scene.plotSprite(tileX * 4 + 48 + offsetX, (CollisionConstants.SIZE - tileZ - loc.length) * 4 + offsetY + 48);
                }
            }
        }

        typecode = this.world.sceneType(level, tileX, tileZ);
        if (typecode !== 0) {
            const info: number = this.world.typecode2(level, tileX, tileZ, typecode);
            const angle: number = (info >> 6) & 0x3;
            const shape: number = info & 0x1f;
            const locId: number = (typecode >> 14) & 0x7fff;

            const loc: LocType = LocType.get(locId);
            if (loc.mapscene === -1) {
                if (shape === LocShape.WALL_DIAGONAL.id) {
                    let rgb: number = 0xeeeeee;
                    if (typecode > 0) {
                        rgb = 0xee0000;
                    }

                    const dst: Int32Array = this.minimap.data;
                    const offset: number = tileX * 4 + (CollisionConstants.SIZE - 1 - tileZ) * 512 * 4 + 24624;

                    if (angle === LocAngle.WEST || angle === LocAngle.EAST) {
                        dst[offset + 1536] = rgb;
                        dst[offset + 1024 + 1] = rgb;
                        dst[offset + 512 + 2] = rgb;
                        dst[offset + 3] = rgb;
                    } else {
                        dst[offset] = rgb;
                        dst[offset + 512 + 1] = rgb;
                        dst[offset + 1024 + 2] = rgb;
                        dst[offset + 1536 + 3] = rgb;
                    }
                }
            } else {
                const scene: Pix8 | null = this.mapscene[loc.mapscene];
                if (scene) {
                    const offsetX: number = ((loc.width * 4 - scene.wi) / 2) | 0;
                    const offsetY: number = ((loc.length * 4 - scene.hi) / 2) | 0;
                    scene.plotSprite(tileX * 4 + 48 + offsetX, (CollisionConstants.SIZE - tileZ - loc.length) * 4 + offsetY + 48);
                }
            }
        }

        typecode = this.world.gdType(level, tileX, tileZ);
        if (typecode !== 0) {
            const locId = (typecode >> 14) & 0x7fff;

            const loc: LocType = LocType.get(locId);
            if (loc.mapscene !== -1) {
                const scene: Pix8 | null = this.mapscene[loc.mapscene];
                if (scene) {
                    const offsetX: number = ((loc.width * 4 - scene.wi) / 2) | 0;
                    const offsetY: number = ((loc.length * 4 - scene.hi) / 2) | 0;
                    scene.plotSprite(tileX * 4 + 48 + offsetX, (CollisionConstants.SIZE - tileZ - loc.length) * 4 + offsetY + 48);
                }
            }
        }
    }

    private interactWithLoc(opcode: number, x: number, z: number, typecode: number): boolean {
        if (!this.localPlayer || !this.world) {
            return false;
        }

        const locId: number = (typecode >> 14) & 0x7fff;
        const info: number = this.world.typecode2(this.minusedlevel, x, z, typecode);
        if (info === -1) {
            return false;
        }

        const shape: number = info & 0x1f;
        const angle: number = (info >> 6) & 0x3;

        Client.cyclelogic2++;
        if (Client.cyclelogic2 > 1086) {
            Client.cyclelogic2 = 0;

            this.out.pIsaac(ClientProt.ANTICHEAT_CYCLELOGIC2);
            this.out.p1(0);
            const start = this.out.pos;
            if (((Math.random() * 2.0) | 0) == 0) {
                this.out.p2(16791);
            }
            this.out.p1(254);
            this.out.p2((Math.random() * 65536.0) | 0);
            this.out.p2(16128);
            this.out.p2(52610);
            this.out.p2((Math.random() * 65536.0) | 0);
            this.out.p2(55420);
            if (((Math.random() * 2.0) | 0) == 0) {
                this.out.p2(35025);
            }
            this.out.p2(46628);
            this.out.p1((Math.random() * 256.0) | 0);
            this.out.psize1(this.out.pos - start);
        }

        if (shape === LocShape.CENTREPIECE_STRAIGHT.id || shape === LocShape.CENTREPIECE_DIAGONAL.id || shape === LocShape.GROUND_DECOR.id) {
            const loc: LocType = LocType.get(locId);

            let width: number;
            let height: number;
            if (angle === LocAngle.WEST || angle === LocAngle.EAST) {
                width = loc.width;
                height = loc.length;
            } else {
                width = loc.length;
                height = loc.width;
            }

            let forceapproach: number = loc.forceapproach;
            if (angle !== 0) {
                forceapproach = ((forceapproach << angle) & 0xf) + (forceapproach >> (4 - angle));
            }

            this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], x, z, 2, width, height, 0, 0, forceapproach, false);
        } else {
            this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], x, z, 2, 0, 0, angle, shape + 1, 0, false);
        }

        this.crossX = this.mouseClickX;
        this.crossY = this.mouseClickY;
        this.crossMode = 2;
        this.crossCycle = 0;

        this.out.pIsaac(opcode);
        this.out.p2(x + this.mapBuildBaseX);
        this.out.p2(z + this.mapBuildBaseZ);
        this.out.p2(locId);
        return true;
    }

    private tryMove(srcX: number, srcZ: number, dx: number, dz: number, type: number, locWidth: number, locLength: number, locAngle: number, locShape: number, forceapproach: number, tryNearest: boolean): boolean {
        const collisionMap: CollisionMap | null = this.levelCollisionMap[this.minusedlevel];
        if (!collisionMap) {
            return false;
        }

        const sceneWidth: number = CollisionConstants.SIZE;
        const sceneLength: number = CollisionConstants.SIZE;

        for (let x: number = 0; x < sceneWidth; x++) {
            for (let z: number = 0; z < sceneLength; z++) {
                const index: number = CollisionMap.index(x, z);
                this.bfsDirection[index] = 0;
                this.bfsCost[index] = 99999999;
            }
        }

        let x: number = srcX;
        let z: number = srcZ;

        const srcIndex: number = CollisionMap.index(srcX, srcZ);
        this.bfsDirection[srcIndex] = 99;
        this.bfsCost[srcIndex] = 0;

        let steps: number = 0;
        let length: number = 0;

        this.bfsStepX[steps] = srcX;
        this.bfsStepZ[steps++] = srcZ;

        let arrived: boolean = false;
        let bufferSize: number = this.bfsStepX.length;
        const flags: Int32Array = collisionMap.flags;

        while (length !== steps) {
            x = this.bfsStepX[length];
            z = this.bfsStepZ[length];
            length = (length + 1) % bufferSize;

            if (x === dx && z === dz) {
                arrived = true;
                break;
            }

            if (locShape !== LocShape.WALL_STRAIGHT.id) {
                if ((locShape < LocShape.WALLDECOR_STRAIGHT_OFFSET.id || locShape === LocShape.CENTREPIECE_STRAIGHT.id) && collisionMap.testWall(x, z, dx, dz, locShape - 1, locAngle)) {
                    arrived = true;
                    break;
                }

                if (locShape < LocShape.CENTREPIECE_STRAIGHT.id && collisionMap.testWDecor(x, z, dx, dz, locShape - 1, locAngle)) {
                    arrived = true;
                    break;
                }
            }

            if (locWidth !== 0 && locLength !== 0 && collisionMap.testLoc(x, z, dx, dz, locWidth, locLength, forceapproach)) {
                arrived = true;
                break;
            }

            const nextCost: number = this.bfsCost[CollisionMap.index(x, z)] + 1;
            let index: number = CollisionMap.index(x - 1, z);
            if (x > 0 && this.bfsDirection[index] === 0 && (flags[index] & CollisionFlag.BLOCK_WEST) === CollisionFlag.OPEN) {
                this.bfsStepX[steps] = x - 1;
                this.bfsStepZ[steps] = z;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 2;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x + 1, z);
            if (x < sceneWidth - 1 && this.bfsDirection[index] === 0 && (flags[index] & CollisionFlag.BLOCK_EAST) === CollisionFlag.OPEN) {
                this.bfsStepX[steps] = x + 1;
                this.bfsStepZ[steps] = z;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 8;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x, z - 1);
            if (z > 0 && this.bfsDirection[index] === 0 && (flags[index] & CollisionFlag.BLOCK_SOUTH) === CollisionFlag.OPEN) {
                this.bfsStepX[steps] = x;
                this.bfsStepZ[steps] = z - 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 1;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x, z + 1);
            if (z < sceneLength - 1 && this.bfsDirection[index] === 0 && (flags[index] & CollisionFlag.BLOCK_NORTH) === CollisionFlag.OPEN) {
                this.bfsStepX[steps] = x;
                this.bfsStepZ[steps] = z + 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 4;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x - 1, z - 1);
            if (
                x > 0 &&
                z > 0 &&
                this.bfsDirection[index] === 0 &&
                (flags[index] & CollisionFlag.BLOCK_SOUTH_WEST) === 0 &&
                (flags[CollisionMap.index(x - 1, z)] & CollisionFlag.BLOCK_WEST) === CollisionFlag.OPEN &&
                (flags[CollisionMap.index(x, z - 1)] & CollisionFlag.BLOCK_SOUTH) === CollisionFlag.OPEN
            ) {
                this.bfsStepX[steps] = x - 1;
                this.bfsStepZ[steps] = z - 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 3;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x + 1, z - 1);
            if (
                x < sceneWidth - 1 &&
                z > 0 &&
                this.bfsDirection[index] === 0 &&
                (flags[index] & CollisionFlag.BLOCK_SOUTH_EAST) === 0 &&
                (flags[CollisionMap.index(x + 1, z)] & CollisionFlag.BLOCK_EAST) === CollisionFlag.OPEN &&
                (flags[CollisionMap.index(x, z - 1)] & CollisionFlag.BLOCK_SOUTH) === CollisionFlag.OPEN
            ) {
                this.bfsStepX[steps] = x + 1;
                this.bfsStepZ[steps] = z - 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 9;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x - 1, z + 1);
            if (
                x > 0 &&
                z < sceneLength - 1 &&
                this.bfsDirection[index] === 0 &&
                (flags[index] & CollisionFlag.BLOCK_NORTH_WEST) === 0 &&
                (flags[CollisionMap.index(x - 1, z)] & CollisionFlag.BLOCK_WEST) === CollisionFlag.OPEN &&
                (flags[CollisionMap.index(x, z + 1)] & CollisionFlag.BLOCK_NORTH) === CollisionFlag.OPEN
            ) {
                this.bfsStepX[steps] = x - 1;
                this.bfsStepZ[steps] = z + 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 6;
                this.bfsCost[index] = nextCost;
            }

            index = CollisionMap.index(x + 1, z + 1);
            if (
                x < sceneWidth - 1 &&
                z < sceneLength - 1 &&
                this.bfsDirection[index] === 0 &&
                (flags[index] & CollisionFlag.BLOCK_NORTH_EAST) === 0 &&
                (flags[CollisionMap.index(x + 1, z)] & CollisionFlag.BLOCK_EAST) === CollisionFlag.OPEN &&
                (flags[CollisionMap.index(x, z + 1)] & CollisionFlag.BLOCK_NORTH) === CollisionFlag.OPEN
            ) {
                this.bfsStepX[steps] = x + 1;
                this.bfsStepZ[steps] = z + 1;
                steps = (steps + 1) % bufferSize;
                this.bfsDirection[index] = 12;
                this.bfsCost[index] = nextCost;
            }
        }

        this.tryMoveNearest = 0;

        if (!arrived) {
            if (tryNearest) {
                let min: number = 100;
                for (let padding: number = 1; padding < 2; padding++) {
                    for (let px: number = dx - padding; px <= dx + padding; px++) {
                        for (let pz: number = dz - padding; pz <= dz + padding; pz++) {
                            const index: number = CollisionMap.index(px, pz);
                            if (px >= 0 && pz >= 0 && px < CollisionConstants.SIZE && pz < CollisionConstants.SIZE && this.bfsCost[index] < min) {
                                min = this.bfsCost[index];
                                x = px;
                                z = pz;
                                this.tryMoveNearest = 1;
                                arrived = true;
                            }
                        }
                    }

                    if (arrived) {
                        break;
                    }
                }
            }

            if (!arrived) {
                return false;
            }
        }

        length = 0;
        this.bfsStepX[length] = x;
        this.bfsStepZ[length++] = z;

        let dir: number = this.bfsDirection[CollisionMap.index(x, z)];
        let next: number = dir;
        while (x !== srcX || z !== srcZ) {
            if (next !== dir) {
                dir = next;
                this.bfsStepX[length] = x;
                this.bfsStepZ[length++] = z;
            }

            if ((next & DirectionFlag.EAST) !== 0) {
                x++;
            } else if ((next & DirectionFlag.WEST) !== 0) {
                x--;
            }

            if ((next & DirectionFlag.NORTH) !== 0) {
                z++;
            } else if ((next & DirectionFlag.SOUTH) !== 0) {
                z--;
            }

            next = this.bfsDirection[CollisionMap.index(x, z)];
        }

        if (length > 0) {
            bufferSize = Math.min(length, 25); // max number of turns in a single pf request
            length--;

            const startX: number = this.bfsStepX[length];
            const startZ: number = this.bfsStepZ[length];

            if (type === 0) {
                this.out.pIsaac(ClientProt.MOVE_GAMECLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            } else if (type === 1) {
                this.out.pIsaac(ClientProt.MOVE_MINIMAPCLICK);
                this.out.p1(bufferSize + bufferSize + 3 + 14);
            } else if (type === 2) {
                this.out.pIsaac(ClientProt.MOVE_OPCLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            }

            if (this.keyHeld[5] === 1) {
                this.out.p1(1);
            } else {
                this.out.p1(0);
            }

            this.out.p2(startX + this.mapBuildBaseX);
            this.out.p2(startZ + this.mapBuildBaseZ);

            this.flagTileX = this.bfsStepX[0];
            this.flagTileZ = this.bfsStepZ[0];

            for (let i: number = 1; i < bufferSize; i++) {
                length--;
                this.out.p1(this.bfsStepX[length] - startX);
                this.out.p1(this.bfsStepZ[length] - startZ);
            }

            return true;
        }

        return type !== 1;
    }

    // jag::oldscape::Client::TcpIn
    private async tcpIn(): Promise<boolean> {
        if (!this.stream) {
            return false;
        }

        try {
            let available: number = this.stream.available;
            if (available === 0) {
                return false;
            }

            if (this.ptype === -1) {
                await this.stream.readBytes(this.in.data, 0, 1);
                this.ptype = this.in.data[0] & 0xff;
                if (this.randomIn) {
                    this.ptype = (this.ptype - this.randomIn.nextInt) & 0xff;
                }
                this.psize = ServerProtSizes[this.ptype];
                available--;
            }

            if (this.psize === -1) {
                if (available <= 0) {
                    return false;
                }

                await this.stream.readBytes(this.in.data, 0, 1);
                this.psize = this.in.data[0] & 0xff;
                available--;
            }

            if (this.psize === -2) {
                if (available <= 1) {
                    return false;
                }

                await this.stream.readBytes(this.in.data, 0, 2);
                this.in.pos = 0;
                this.psize = this.in.g2();
                available -= 2;
            }

            if (available < this.psize) {
                return false;
            }

            this.in.pos = 0;
            await this.stream.readBytes(this.in.data, 0, this.psize);

            this.packetCycle = performance.now();
            this.ptype2 = this.ptype1;
            this.ptype1 = this.ptype0;
            this.ptype0 = this.ptype;

            if (this.ptype === ServerProt.IF_OPENCHAT) {
                const comId: number = this.in.g2();

                this.resetInterfaceAnimation(comId);

                if (this.sideLayerId !== -1) {
                    this.sideLayerId = -1;
                    this.redrawSidebar = true;
                    this.redrawSideicons = true;
                }

                this.chatLayerId = comId;
                this.redrawChatback = true;
                this.mainLayerId = -1;
                this.pressedContinueOption = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_OPENMAIN_SIDE) {
                const main: number = this.in.g2();
                const side: number = this.in.g2();

                if (this.chatLayerId !== -1) {
                    this.chatLayerId = -1;
                    this.redrawChatback = true;
                }

                if (this.chatbackInputOpen) {
                    this.chatbackInputOpen = false;
                    this.redrawChatback = true;
                }

                this.mainLayerId = main;
                this.sideLayerId = side;
                this.redrawSidebar = true;
                this.redrawSideicons = true;
                this.pressedContinueOption = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_CLOSE) {
                if (this.sideLayerId !== -1) {
                    this.sideLayerId = -1;
                    this.redrawSidebar = true;
                    this.redrawSideicons = true;
                }

                if (this.chatLayerId !== -1) {
                    this.chatLayerId = -1;
                    this.redrawChatback = true;
                }

                if (this.chatbackInputOpen) {
                    this.chatbackInputOpen = false;
                    this.redrawChatback = true;
                }

                this.mainLayerId = -1;
                this.pressedContinueOption = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETTAB) {
                let comId: number = this.in.g2();
                const tab: number = this.in.g1();

                if (comId === 65535) {
                    comId = -1;
                }

                this.sideTabLayerId[tab] = comId;
                this.redrawSidebar = true;
                this.redrawSideicons = true;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_OPENMAIN) {
                const ifid: number = this.in.g2();

                this.resetInterfaceAnimation(ifid);

                if (this.sideLayerId !== -1) {
                    this.sideLayerId = -1;
                    this.redrawSidebar = true;
                    this.redrawSideicons = true;
                }

                if (this.chatLayerId !== -1) {
                    this.chatLayerId = -1;
                    this.redrawChatback = true;
                }

                if (this.chatbackInputOpen) {
                    this.chatbackInputOpen = false;
                    this.redrawChatback = true;
                }

                this.mainLayerId = ifid;
                this.pressedContinueOption = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_OPENSIDE) {
                const com: number = this.in.g2();

                this.resetInterfaceAnimation(com);

                if (this.chatLayerId !== -1) {
                    this.chatLayerId = -1;
                    this.redrawChatback = true;
                }

                if (this.chatbackInputOpen) {
                    this.chatbackInputOpen = false;
                    this.redrawChatback = true;
                }

                this.sideLayerId = com;
                this.redrawSidebar = true;
                this.redrawSideicons = true;
                this.mainLayerId = -1;
                this.pressedContinueOption = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETTAB_ACTIVE) {
                this.sideTab = this.in.g1();

                this.redrawSidebar = true;
                this.redrawSideicons = true;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_OPENOVERLAY) {
                const com = this.in.g2b();
                this.mainOverlayLayerId = com;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETCOLOUR) {
                const com: number = this.in.g2();
                const color: number = this.in.g2();

                const r: number = (color >> 10) & 0x1f;
                const g: number = (color >> 5) & 0x1f;
                const b: number = color & 0x1f;
                IfType.list[com].colour = (r << 19) + (g << 11) + (b << 3);

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETHIDE) {
                const comId: number = this.in.g2();
                const hide = this.in.g1() === 1;

                IfType.list[comId].hidden = hide;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETOBJECT) {
                const c: number = this.in.g2();
                const obj: number = this.in.g2();
                const zoom: number = this.in.g2();

                const type: ObjType = ObjType.get(obj);
                IfType.list[c].modelType = 4;
                IfType.list[c].modelId = obj;
                IfType.list[c].modelXAn = type.xan2d;
                IfType.list[c].modelYAn = type.yan2d;
                IfType.list[c].modelZoom = ((type.zoom2d * 100) / zoom) | 0;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETMODEL) {
                const com: number = this.in.g2();
                const m: number = this.in.g2();

                IfType.list[com].modelType = 1;
                IfType.list[com].modelId = m;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETANIM) {
                const com: number = this.in.g2();
                IfType.list[com].modelAnim = this.in.g2();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETPLAYERHEAD) {
                const comId = this.in.g2();

                if (this.localPlayer) {
                    IfType.list[comId].modelType = 3;
                    IfType.list[comId].modelId = (this.localPlayer.appearance[8] << 6) + (this.localPlayer.appearance[0] << 12) + (this.localPlayer.colour[0] << 24) + (this.localPlayer.colour[4] << 18) + this.localPlayer.appearance[11];
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETTEXT) {
                const comId: number = this.in.g2();
                const text = this.in.gjstr();

                IfType.list[comId].text = text;

                if (IfType.list[comId].layerId === this.sideTabLayerId[this.sideTab]) {
                    this.redrawSidebar = true;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETNPCHEAD) {
                const com: number = this.in.g2();
                const npcId: number = this.in.g2();

                IfType.list[com].modelType = 2;
                IfType.list[com].modelId = npcId;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETPOSITION) {
                const comId: number = this.in.g2();
                const x: number = this.in.g2b();
                const z: number = this.in.g2b();

                const com: IfType = IfType.list[comId];
                com.x = x;
                com.y = z;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.IF_SETSCROLLPOS) {
                const com: number = this.in.g2();
                let pos: number = this.in.g2();

                const inter = IfType.list[com];
                if (typeof inter !== 'undefined' && inter.type === ComponentType.TYPE_LAYER) {
                    if (pos < 0) {
                        pos = 0;
                    }

                    if (pos > inter.scrollSize - inter.height) {
                        pos = inter.scrollSize - inter.height;
                    }

                    inter.scrollPos = pos;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.TUT_FLASH) {
                this.flashingTab = this.in.g1();

                if (this.flashingTab === this.sideTab) {
                    if (this.flashingTab === 3) {
                        this.sideTab = 1;
                    } else {
                        this.sideTab = 3;
                    }

                    this.redrawSidebar = true;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.TUT_OPEN) {
                this.tutLayerId = this.in.g2b();
                this.redrawChatback = true;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_INV_STOP_TRANSMIT) {
                const component = this.in.g2();
                const inv: IfType = IfType.list[component];

                if (inv.linkObjType) {
                    for (let i: number = 0; i < inv.linkObjType.length; i++) {
                        inv.linkObjType[i] = -1;
                        inv.linkObjType[i] = 0;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_INV_FULL) {
                this.redrawSidebar = true;

                const component: number = this.in.g2();
                const inv: IfType = IfType.list[component];
                const size: number = this.in.g1();

                if (inv.linkObjType && inv.linkObjCount) {
                    for (let i: number = 0; i < size; i++) {
                        inv.linkObjType[i] = this.in.g2();

                        let count: number = this.in.g1();
                        if (count === 255) {
                            count = this.in.g4();
                        }

                        inv.linkObjCount[i] = count;
                    }

                    for (let i: number = size; i < inv.linkObjType.length; i++) {
                        inv.linkObjType[i] = 0;
                        inv.linkObjCount[i] = 0;
                    }
                } else {
                    for (let i: number = 0; i < size; i++) {
                        this.in.g2();

                        if (this.in.g1() === 255) {
                            this.in.g4();
                        }
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_INV_PARTIAL) {
                this.redrawSidebar = true;

                const component: number = this.in.g2();
                const inv: IfType = IfType.list[component];

                while (this.in.pos < this.psize) {
                    const slot: number = this.in.g1();
                    const id: number = this.in.g2();

                    let count: number = this.in.g1();
                    if (count === 255) {
                        count = this.in.g4();
                    }

                    if (inv.linkObjType && inv.linkObjCount && slot >= 0 && slot < inv.linkObjType.length) {
                        inv.linkObjType[slot] = id;
                        inv.linkObjCount[slot] = count;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.CAM_LOOKAT) {
                this.cinemaCam = true;

                this.camLookAtLx = this.in.g1();
                this.camLookAtLz = this.in.g1();
                this.camLookAtHei = this.in.g2();
                this.camLookAtRate = this.in.g1();
                this.camLookAtRate2 = this.in.g1();

                if (this.camLookAtRate2 >= 100) {
                    const sceneX: number = this.camLookAtLx * 128 + 64;
                    const sceneZ: number = this.camLookAtLz * 128 + 64;
                    const sceneY: number = this.getAvH(this.minusedlevel, sceneX, sceneZ) - this.camLookAtHei;

                    const deltaX: number = sceneX - this.cinemaX;
                    const deltaY: number = sceneY - this.cinemaY;
                    const deltaZ: number = sceneZ - this.cinemaZ;

                    const distance: number = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ) | 0;

                    this.cinemaPitch = ((Math.atan2(deltaY, distance) * 325.949) | 0) & 0x7ff;
                    this.cinemaYaw = ((Math.atan2(deltaX, deltaZ) * -325.949) | 0) & 0x7ff;

                    if (this.cinemaPitch < 128) {
                        this.cinemaPitch = 128;
                    } else if (this.cinemaPitch > 383) {
                        this.cinemaPitch = 383;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.CAM_SHAKE) {
                const axis: number = this.in.g1();
                const ran: number = this.in.g1();
                const amp: number = this.in.g1();
                const rate: number = this.in.g1();

                this.camShake[axis] = true;
                this.camShakeAxis[axis] = ran;
                this.camShakeRan[axis] = amp;
                this.camShakeAmp[axis] = rate;
                this.camShakeCycle[axis] = 0;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.CAM_MOVETO) {
                this.cinemaCam = true;

                this.camMoveToLx = this.in.g1();
                this.camMoveToLz = this.in.g1();
                this.camMoveToHei = this.in.g2();
                this.camMoveToRate = this.in.g1();
                this.camMoveToRate2 = this.in.g1();

                if (this.camMoveToRate2 >= 100) {
                    this.cinemaX = this.camMoveToLx * 128 + 64;
                    this.cinemaZ = this.camMoveToLz * 128 + 64;
                    this.cinemaY = this.getAvH(this.minusedlevel, this.cinemaX, this.cinemaZ) - this.camMoveToHei;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.CAM_RESET) {
                this.cinemaCam = false;

                for (let i: number = 0; i < 5; i++) {
                    this.camShake[i] = false;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.NPC_INFO) {
                this.getNpcPos(this.in, this.psize);

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.PLAYER_INFO) {
                this.getPlayerPos(this.in, this.psize);
                this.awaitingPlayerInfo = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.FINISH_TRACKING) {
                const tracking: Packet | null = InputTracking.stop();
                if (tracking) {
                    this.out.pIsaac(ClientProt.EVENT_TRACKING);
                    this.out.p2(tracking.pos);
                    this.out.pdata(tracking.data, tracking.pos, 0);
                    tracking.release();
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.ENABLE_TRACKING) {
                InputTracking.activate();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.MESSAGE_GAME) {
                const message: string = this.in.gjstr();

                if (message.endsWith(':tradereq:')) {
                    const player: string = message.substring(0, message.indexOf(':'));
                    const username = JString.toBase37(player);

                    let ignored: boolean = false;
                    for (let i: number = 0; i < this.ignoreCount; i++) {
                        if (this.ignoreName37[i] === username) {
                            ignored = true;
                            break;
                        }
                    }

                    if (!ignored && this.chatDisabled === 0) {
                        this.addChat(4, 'wishes to trade with you.', player);
                    }
                } else if (message.endsWith(':duelreq:')) {
                    const player: string = message.substring(0, message.indexOf(':'));
                    const username = JString.toBase37(player);

                    let ignored: boolean = false;
                    for (let i: number = 0; i < this.ignoreCount; i++) {
                        if (this.ignoreName37[i] === username) {
                            ignored = true;
                            break;
                        }
                    }

                    if (!ignored && this.chatDisabled === 0) {
                        this.addChat(8, 'wishes to duel with you.', player);
                    }
                } else {
                    this.addChat(0, message, '');
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_IGNORELIST) {
                this.ignoreCount = (this.psize / 8) | 0;
                for (let i: number = 0; i < this.ignoreCount; i++) {
                    this.ignoreName37[i] = this.in.g8();
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.CHAT_FILTER_SETTINGS) {
                this.chatPublicMode = this.in.g1();
                this.chatPrivateMode = this.in.g1();
                this.chatTradeMode = this.in.g1();

                this.redrawPrivacySettings = true;
                this.redrawChatback = true;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.MESSAGE_PRIVATE) {
                const from: bigint = this.in.g8();
                const messageId: number = this.in.g4();
                const staffModLevel: number = this.in.g1();

                let ignored: boolean = false;
                for (let i: number = 0; i < 100; i++) {
                    if (this.messageTextIds[i] === messageId) {
                        ignored = true;
                        break;
                    }
                }

                if (staffModLevel <= 1) {
                    for (let i: number = 0; i < this.ignoreCount; i++) {
                        if (this.ignoreName37[i] === from) {
                            ignored = true;
                            break;
                        }
                    }
                }

                if (!ignored && this.chatDisabled === 0) {
                    try {
                        this.messageTextIds[this.privateMessageCount] = messageId;
                        this.privateMessageCount = (this.privateMessageCount + 1) % 100;
                        const uncompressed: string = WordPack.unpack(this.in, this.psize - 13);
                        const filtered: string = WordFilter.filter(uncompressed);

                        if (staffModLevel === 2 || staffModLevel === 3) {
                            this.addChat(7, filtered, '@cr2@' + JString.formatName(JString.fromBase37(from)));
                        } else if (staffModLevel === 1) {
                            this.addChat(7, filtered, '@cr1@' + JString.formatName(JString.fromBase37(from)));
                        } else {
                            this.addChat(3, filtered, JString.formatName(JString.fromBase37(from)));
                        }
                    } catch (e) {
                        // signlink.reporterror('cde1'); TODO?
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.FRIENDLIST_LOADED) {
                this.friendListStatus = this.in.g1();
                this.redrawSidebar = true;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_FRIENDLIST) {
                const username: bigint = this.in.g8();
                const world: number = this.in.g1();

                let displayName: string | null = JString.formatName(JString.fromBase37(username));
                for (let i: number = 0; i < this.friendCount; i++) {
                    if (username === this.friendName37[i]) {
                        if (this.friendWorld[i] !== world) {
                            this.friendWorld[i] = world;
                            this.redrawSidebar = true;
                            if (world > 0) {
                                this.addChat(5, displayName + ' has logged in.', '');
                            }
                            if (world === 0) {
                                this.addChat(5, displayName + ' has logged out.', '');
                            }
                        }

                        displayName = null;
                        break;
                    }
                }

                if (displayName && this.friendCount < 200) {
                    this.friendName37[this.friendCount] = username;
                    this.friendName[this.friendCount] = displayName;
                    this.friendWorld[this.friendCount] = world;
                    this.friendCount++;
                    this.redrawSidebar = true;
                }

                let sorted: boolean = false;
                while (!sorted) {
                    sorted = true;

                    for (let i: number = 0; i < this.friendCount - 1; i++) {
                        if ((this.friendWorld[i] !== Client.nodeId && this.friendWorld[i + 1] === Client.nodeId) || (this.friendWorld[i] === 0 && this.friendWorld[i + 1] !== 0)) {
                            const oldWorld: number = this.friendWorld[i];
                            this.friendWorld[i] = this.friendWorld[i + 1];
                            this.friendWorld[i + 1] = oldWorld;

                            const oldName: string | null = this.friendName[i];
                            this.friendName[i] = this.friendName[i + 1];
                            this.friendName[i + 1] = oldName;

                            const oldName37: bigint = this.friendName37[i];
                            this.friendName37[i] = this.friendName37[i + 1];
                            this.friendName37[i + 1] = oldName37;
                            this.redrawSidebar = true;
                            sorted = false;
                        }
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UNSET_MAP_FLAG) {
                this.flagTileX = 0;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_RUNWEIGHT) {
                if (this.sideTab === 12) {
                    this.redrawSidebar = true;
                }

                this.runweight = this.in.g2b();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.HINT_ARROW) {
                this.hintType = this.in.g1();

                if (this.hintType === 1) {
                    this.hintNpc = this.in.g2();
                }

                if (this.hintType >= 2 && this.hintType <= 6) {
                    if (this.hintType === 2) {
                        this.hintOffsetX = 64;
                        this.hintOffsetZ = 64;
                    } else if (this.hintType === 3) {
                        this.hintOffsetX = 0;
                        this.hintOffsetZ = 64;
                    } else if (this.hintType === 4) {
                        this.hintOffsetX = 128;
                        this.hintOffsetZ = 64;
                    } else if (this.hintType === 5) {
                        this.hintOffsetX = 64;
                        this.hintOffsetZ = 0;
                    } else if (this.hintType === 6) {
                        this.hintOffsetX = 64;
                        this.hintOffsetZ = 128;
                    }

                    this.hintType = 2;
                    this.hintTileX = this.in.g2();
                    this.hintTileZ = this.in.g2();
                    this.hintHeight = this.in.g1();
                }

                if (this.hintType === 10) {
                    this.hintPlayer = this.in.g2();
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_REBOOT_TIMER) {
                this.systemUpdateTimer = this.in.g2() * 30;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_STAT) {
                this.redrawSidebar = true;

                const stat: number = this.in.g1();
                const xp: number = this.in.g4();
                const level: number = this.in.g1();

                this.statXP[stat] = xp;
                this.statEffectiveLevel[stat] = level;
                this.statBaseLevel[stat] = 1;

                for (let i: number = 0; i < 98; i++) {
                    if (xp >= this.levelExperience[i]) {
                        this.statBaseLevel[stat] = i + 2;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_RUNENERGY) {
                if (this.sideTab === 12) {
                    this.redrawSidebar = true;
                }

                this.runenergy = this.in.g1();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.RESET_ANIMS) {
                for (let i: number = 0; i < this.players.length; i++) {
                    const player: ClientPlayer | null = this.players[i];
                    if (!player) {
                        continue;
                    }

                    player.primarySeqId = -1;
                }

                for (let i: number = 0; i < this.npc.length; i++) {
                    const npc: ClientNpc | null = this.npc[i];
                    if (!npc) {
                        continue;
                    }

                    npc.primarySeqId = -1;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_PID) {
                this.localPid = this.in.g2();
                this.membersAccount = this.in.g1();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.LAST_LOGIN_INFO) {
                this.lastAddress = this.in.g4();
                this.daysSinceLastLogin = this.in.g2();
                this.daysSinceRecoveriesChanged = this.in.g1();
                this.unreadMessages = this.in.g2();
                this.warnMembersInNonMembers = this.in.g1();

                if (this.lastAddress !== 0 && this.mainLayerId === -1) {
                    this.closeModal();

                    let contentType: number = 650;
                    if (this.daysSinceRecoveriesChanged !== 201 || this.warnMembersInNonMembers == 1) {
                        contentType = 655;
                    }

                    this.reportAbuseInput = '';
                    this.reportAbuseMuteOption = false;

                    for (let i: number = 0; i < IfType.list.length; i++) {
                        if (IfType.list[i] && IfType.list[i].clientCode === contentType) {
                            this.mainLayerId = IfType.list[i].layerId;
                            break;
                        }
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.LOGOUT) {
                await this.logout();

                this.ptype = -1;
                return false;
            }

            if (this.ptype === ServerProt.P_COUNTDIALOG) {
                this.showSocialInput = false;
                this.chatbackInputOpen = true;
                this.chatbackInput = '';
                this.redrawChatback = true;

                if (this.isMobile) {
                    MobileKeyboard.show();
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.SET_MULTIWAY) {
                this.inMultizone = this.in.g1();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.SET_PLAYER_OP) {
                const index = this.in.g1();
                const priority = this.in.g1();
                let op: string | null = this.in.gjstr();

                if (index >= 1 && index <= 5) {
                    if (op.toLowerCase() === 'null') {
                        op = null;
                    }

                    this.playerOp[index - 1] = op;
                    this.playerOpPriority[index - 1] = priority === 0;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.REBUILD_NORMAL) {
                const zoneX: number = this.in.g2();
                const zoneZ: number = this.in.g2();

                if (this.mapBuildCenterZoneX === zoneX && this.mapBuildCenterZoneZ === zoneZ && this.sceneState !== 0) {
                    this.ptype = -1;
                    return true;
                }

                this.mapBuildCenterZoneX = zoneX;
                this.mapBuildCenterZoneZ = zoneZ;
                this.mapBuildBaseX = (this.mapBuildCenterZoneX - 6) * 8;
                this.mapBuildBaseZ = (this.mapBuildCenterZoneZ - 6) * 8;

                this.withinTutorialIsland = false;
                if ((this.mapBuildCenterZoneX / 8 == 48 || this.mapBuildCenterZoneX / 8 == 49) && this.mapBuildCenterZoneZ / 8 == 48) {
                    this.withinTutorialIsland = true;
                } else if (this.mapBuildCenterZoneX / 8 == 48 && this.mapBuildCenterZoneZ / 8 == 148) {
                    this.withinTutorialIsland = true;
                }

                this.sceneState = 1;
                this.sceneLoadStartTime = performance.now();

                this.areaViewport?.bind();
                this.fontPlain12?.centreString(257, 151, 'Loading - please wait.', Colors.BLACK);
                this.fontPlain12?.centreString(256, 150, 'Loading - please wait.', Colors.WHITE);
                this.areaViewport?.draw(4, 4);

                let regions = 0;
                for (let x = ((this.mapBuildCenterZoneX - 6) / 8) | 0; x <= (((this.mapBuildCenterZoneX + 6) / 8) | 0); x++) {
                    for (let z = ((this.mapBuildCenterZoneZ - 6) / 8) | 0; z <= (((this.mapBuildCenterZoneZ + 6) / 8) | 0); z++) {
                        regions++;
                    }
                }

                this.mapBuildGroundData = new TypedArray1d(regions, null);
                this.mapBuildLocationData = new TypedArray1d(regions, null);
                this.mapBuildIndex = new Int32Array(regions);
                this.mapBuildGroundFile = new Array(regions);
                this.mapBuildLocationFile = new Array(regions);

                let mapCount = 0;
                for (let x = ((this.mapBuildCenterZoneX - 6) / 8) | 0; x <= (((this.mapBuildCenterZoneX + 6) / 8) | 0); x++) {
                    for (let z = ((this.mapBuildCenterZoneZ - 6) / 8) | 0; z <= (((this.mapBuildCenterZoneZ + 6) / 8) | 0); z++) {
                        this.mapBuildIndex[mapCount] = (x << 8) + z;

                        if (this.withinTutorialIsland && (z == 49 || z == 149 || z == 147 || x == 50 || x == 49 && z == 47)) {
                            this.mapBuildGroundFile[mapCount] = -1;
                            this.mapBuildLocationFile[mapCount] = -1;
                            mapCount++;
                        } else if (this.onDemand) {
                            let landFile = this.mapBuildGroundFile[mapCount] = this.onDemand.getMapFile(x, z, 0);
                            if (landFile != -1) {
                                this.onDemand.request(3, landFile);
                            }

                            let locFile = this.mapBuildLocationFile[mapCount] = this.onDemand.getMapFile(x, z, 1);
                            if (locFile != -1) {
                                this.onDemand.request(3, locFile);
                            }

                            mapCount++;
                        }
                    }
                }

                const dx: number = this.mapBuildBaseX - this.mapBuildPrevBaseX;
                const dz: number = this.mapBuildBaseZ - this.mapBuildPrevBaseZ;
                this.mapBuildPrevBaseX = this.mapBuildBaseX;
                this.mapBuildPrevBaseZ = this.mapBuildBaseZ;

                for (let i: number = 0; i < 16384; i++) {
                    const npc: ClientNpc | null = this.npc[i];
                    if (npc) {
                        for (let j: number = 0; j < 10; j++) {
                            npc.routeTileX[j] -= dx;
                            npc.routeTileZ[j] -= dz;
                        }

                        npc.x -= dx * 128;
                        npc.z -= dz * 128;
                    }
                }

                for (let i: number = 0; i < Constants.MAX_PLAYER_COUNT; i++) {
                    const player: ClientPlayer | null = this.players[i];
                    if (player) {
                        for (let j: number = 0; j < 10; j++) {
                            player.routeTileX[j] -= dx;
                            player.routeTileZ[j] -= dz;
                        }

                        player.x -= dx * 128;
                        player.z -= dz * 128;
                    }
                }

                this.awaitingPlayerInfo = true;

                let startTileX: number = 0;
                let endTileX: number = CollisionConstants.SIZE;
                let dirX: number = 1;
                if (dx < 0) {
                    startTileX = CollisionConstants.SIZE - 1;
                    endTileX = -1;
                    dirX = -1;
                }

                let startTileZ: number = 0;
                let endTileZ: number = CollisionConstants.SIZE;
                let dirZ: number = 1;
                if (dz < 0) {
                    startTileZ = CollisionConstants.SIZE - 1;
                    endTileZ = -1;
                    dirZ = -1;
                }

                for (let x: number = startTileX; x !== endTileX; x += dirX) {
                    for (let z: number = startTileZ; z !== endTileZ; z += dirZ) {
                        const lastX: number = x + dx;
                        const lastZ: number = z + dz;

                        for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
                            if (lastX >= 0 && lastZ >= 0 && lastX < CollisionConstants.SIZE && lastZ < CollisionConstants.SIZE) {
                                this.objStacks[level][x][z] = this.objStacks[level][lastX][lastZ];
                            } else {
                                this.objStacks[level][x][z] = null;
                            }
                        }
                    }
                }

                for (let loc: LocChange | null = this.locChanges.head() as LocChange | null; loc; loc = this.locChanges.next() as LocChange | null) {
                    loc.x -= dx;
                    loc.z -= dz;

                    if (loc.x < 0 || loc.z < 0 || loc.x >= CollisionConstants.SIZE || loc.z >= CollisionConstants.SIZE) {
                        loc.unlink();
                    }
                }

                if (this.flagTileX !== 0) {
                    this.flagTileX -= dx;
                    this.flagTileZ -= dz;
                }

                this.cinemaCam = false;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.VARP_SMALL) {
                const variable: number = this.in.g2();
                const value: number = this.in.g1b();

                this.varServ[variable] = value;

                if (this.var[variable] !== value) {
                    this.var[variable] = value;
                    this.updateVarp(variable);

                    this.redrawSidebar = true;

                    if (this.tutLayerId !== -1) {
                        this.redrawChatback = true;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.VARP_LARGE) {
                const variable: number = this.in.g2();
                const value: number = this.in.g4();

                this.varServ[variable] = value;

                if (this.var[variable] !== value) {
                    this.var[variable] = value;
                    this.updateVarp(variable);

                    this.redrawSidebar = true;

                    if (this.tutLayerId !== -1) {
                        this.redrawChatback = true;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.VARP_SYNC) {
                // "Resetting variables to authoritative set"
                for (let i: number = 0; i < this.var.length; i++) {
                    if (this.var[i] !== this.varServ[i]) {
                        this.var[i] = this.varServ[i];
                        this.updateVarp(i);

                        this.redrawSidebar = true;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.SYNTH_SOUND) {
                const id: number = this.in.g2();
                const loop: number = this.in.g1();
                const delay: number = this.in.g2();

                if (this.waveEnabled && !Client.lowMem && this.waveCount < 50) {
                    this.waveIds[this.waveCount] = id;
                    this.waveLoops[this.waveCount] = loop;
                    this.waveDelay[this.waveCount] = delay + Wave.delays[id];
                    this.waveCount++;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.MIDI_SONG) {
                let id: number = this.in.g2();
                if (id == 65535) {
                    id = -1;
                }

                if (this.nextMidiSong != id && this.midiActive && !Client.lowMem) {
                    this.midiSong = id;
                    this.midiFading = true;
                    this.onDemand?.request(2, this.midiSong);
                }

                this.nextMidiSong = id;
                this.nextMusicDelay = 0;

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.MIDI_JINGLE) {
                const id: number = this.in.g2();
                const delay: number = this.in.g2();

                if (this.midiActive && !Client.lowMem) {
                    this.midiSong = id;
                    this.midiFading = false;
                    this.onDemand?.request(2, this.midiSong);
                    this.nextMusicDelay = delay;
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_ZONE_PARTIAL_FOLLOWS) {
                this.zoneUpdateX = this.in.g1();
                this.zoneUpdateZ = this.in.g1();

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_ZONE_FULL_FOLLOWS) {
                this.zoneUpdateX = this.in.g1();
                this.zoneUpdateZ = this.in.g1();

                for (let x: number = this.zoneUpdateX; x < this.zoneUpdateX + 8; x++) {
                    for (let z: number = this.zoneUpdateZ; z < this.zoneUpdateZ + 8; z++) {
                        if (this.objStacks[this.minusedlevel][x][z]) {
                            this.objStacks[this.minusedlevel][x][z] = null;
                            this.showObject(x, z);
                        }
                    }
                }

                for (let loc: LocChange | null = this.locChanges.head() as LocChange | null; loc; loc = this.locChanges.next() as LocChange | null) {
                    if (loc.x >= this.zoneUpdateX && loc.x < this.zoneUpdateX + 8 && loc.z >= this.zoneUpdateZ && loc.z < this.zoneUpdateZ + 8 && loc.level === this.minusedlevel) {
                        loc.endTime = 0;
                    }
                }

                this.ptype = -1;
                return true;
            }

            if (this.ptype === ServerProt.UPDATE_ZONE_PARTIAL_ENCLOSED) {
                this.zoneUpdateX = this.in.g1();
                this.zoneUpdateZ = this.in.g1();

                while (this.in.pos < this.psize) {
                    const opcode: number = this.in.g1();
                    this.zonePacket(this.in, opcode);
                }

                this.ptype = -1;
                return true;
            }

            if (
                this.ptype === ServerProt.OBJ_COUNT ||
                this.ptype === ServerProt.P_LOCMERGE ||
                this.ptype === ServerProt.OBJ_REVEAL ||
                this.ptype === ServerProt.MAP_ANIM ||
                this.ptype === ServerProt.MAP_PROJANIM ||
                this.ptype === ServerProt.OBJ_DEL ||
                this.ptype === ServerProt.OBJ_ADD ||
                this.ptype === ServerProt.LOC_ANIM ||
                this.ptype === ServerProt.LOC_DEL ||
                this.ptype === ServerProt.LOC_ADD_CHANGE
            ) {
                this.zonePacket(this.in, this.ptype);

                this.ptype = -1;
                return true;
            }

            console.error(`T1 - ${this.ptype},${this.psize} - ${this.ptype1},${this.ptype2}`);
            await this.logout();
        } catch (e) {
            // todo: try reconnecting if there was an IO error
            console.error(e);

            let str = `T2 - ${this.ptype},${this.psize} - ${this.ptype1},${this.ptype2} - ${this.psize},${(this.localPlayer?.routeTileX[0] ?? 0) + this.mapBuildBaseX},${(this.localPlayer?.routeTileZ[0] ?? 0) + this.mapBuildBaseZ} -`;
            for (let i = 0; i < this.psize && i < 50; i++) {
                str += this.in.data[i] + ',';
            }
            console.error(str);

            await this.logout();
        }

        return true;
    }

    // jag::oldscape::Client::ZonePacket
    private zonePacket(buf: Packet, opcode: number): void {
        const pos: number = buf.g1();
        let x: number = this.zoneUpdateX + ((pos >> 4) & 0x7);
        let z: number = this.zoneUpdateZ + (pos & 0x7);

        if (opcode === ServerProt.LOC_ADD_CHANGE) {
            const info: number = buf.g1();
            const id: number = buf.g2();

            const shape: number = info >> 2;
            const rotate: number = info & 0x3;
            const layer: number = LocShape.of(shape).layer;

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                this.locChangeCreate(-1, id, rotate, layer, z, shape, this.minusedlevel, x, 0);
            }
        } else if (opcode === ServerProt.LOC_DEL) {
            const info: number = buf.g1();

            const shape: number = info >> 2;
            const rotate: number = info & 0x3;
            const layer: number = LocShape.of(shape).layer;

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                this.locChangeCreate(-1, -1, rotate, layer, z, shape, this.minusedlevel, x, 0);
            }
        } else if (opcode === ServerProt.LOC_ANIM) {
            const info: number = buf.g1();
            const seq: number = buf.g2();

            let shape: number = info >> 2;
            const rotate = info & 0x3;
            const layer: number = LocShape.of(shape).layer;

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE && this.world && this.groundh) {
                const heightSW = this.groundh[this.minusedlevel][x][z];
                const heightSE = this.groundh[this.minusedlevel][x + 1][z];
                const heightNE = this.groundh[this.minusedlevel][x + 1][z + 1];
                const heightNW = this.groundh[this.minusedlevel][x][z + 1];

                if (layer == 0) {
                    const wall = this.world.getWall(this.minusedlevel, x, z);
                    if (wall) {
                        const locId = wall.typecode >> 14 & 0x7FFF;
                        if (shape == 2) {
                            wall.model1 = new ClientLocAnim(this.loopCycle, locId, 2, rotate + 4, heightSW, heightSE, heightNE, heightNW, seq, false);
                            wall.model2 = new ClientLocAnim(this.loopCycle, locId, 2, (rotate + 1) & 0x3, heightSW, heightSE, heightNE, heightNW, seq, false);
                        } else {
                            wall.model1 = new ClientLocAnim(this.loopCycle, locId, shape, rotate, heightSW, heightSE, heightNE, heightNW, seq, false);
                        }
                    }
                } else if (layer == 1) {
                    const decor = this.world.getDecor(this.minusedlevel, z, x);
                    if (decor) {
                        decor.model = new ClientLocAnim(this.loopCycle, decor.typecode >> 14 & 0x7FFF, 4, 0, heightSW, heightNE, heightNE, heightNW, seq, false);
                    }
                } else if (layer == 2) {
                    const sprite = this.world.getScene(this.minusedlevel, x, z);
                    if (shape == 11) {
                        shape = 10;
                    }

                    if (sprite) {
                        sprite.model = new ClientLocAnim(this.loopCycle, sprite.typecode >> 14 & 0x7FFF, shape, rotate, heightSW, heightSE, heightNE, heightNW, seq, false);
                    }
                } else if (layer == 3) {
                    const decor = this.world.getGd(this.minusedlevel, x, z);
                    if (decor) {
                        decor.model = new ClientLocAnim(this.loopCycle, decor.typecode >> 14 & 0x7FFF, 22, rotate, heightSW, heightSE, heightNE, heightNW, seq, false);
                    }
                }
            }
        } else if (opcode === ServerProt.OBJ_ADD) {
            const type: number = buf.g2();
            const count: number = buf.g2();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                const obj: ClientObj = new ClientObj(type, count);
                if (!this.objStacks[this.minusedlevel][x][z]) {
                    this.objStacks[this.minusedlevel][x][z] = new LinkList();
                }

                this.objStacks[this.minusedlevel][x][z]?.push(obj);
                this.showObject(x, z);
            }
        } else if (opcode === ServerProt.OBJ_DEL) {
            const type: number = buf.g2();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                const list: LinkList | null = this.objStacks[this.minusedlevel][x][z];
                if (list) {
                    for (let obj: ClientObj | null = list.head() as ClientObj | null; obj; obj = list.next() as ClientObj | null) {
                        if (obj.index === (type & 0x7fff)) {
                            obj.unlink();
                            break;
                        }
                    }

                    if (!list.head()) {
                        this.objStacks[this.minusedlevel][x][z] = null;
                    }

                    this.showObject(x, z);
                }
            }
        } else if (opcode === ServerProt.MAP_PROJANIM) {
            let x2: number = x + buf.g1b();
            let z2: number = z + buf.g1b();
            const targetEntity: number = buf.g2b();
            const spotanim: number = buf.g2();
            const h1: number = buf.g1() * 4;
            const h2: number = buf.g1() * 4;
            const t1: number = buf.g2();
            const t2: number = buf.g2();
            const angle: number = buf.g1();
            const startpos: number = buf.g1();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE && x2 >= 0 && z2 >= 0 && x2 < CollisionConstants.SIZE && z2 < CollisionConstants.SIZE) {
                x = x * 128 + 64;
                z = z * 128 + 64;
                x2 = x2 * 128 + 64;
                z2 = z2 * 128 + 64;

                const proj: ClientProj = new ClientProj(spotanim, this.minusedlevel, x, this.getAvH(this.minusedlevel, x, z) - h1, z, t1 + this.loopCycle, t2 + this.loopCycle, angle, startpos, targetEntity, h2);
                proj.setTarget(x2, this.getAvH(this.minusedlevel, x2, z2) - h2, z2, t1 + this.loopCycle);
                this.projectiles.push(proj);
            }
        } else if (opcode === ServerProt.MAP_ANIM) {
            const spotanim: number = buf.g2();
            const height: number = buf.g1();
            const time: number = buf.g2();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                x = x * 128 + 64;
                z = z * 128 + 64;

                const spot: MapSpotAnim = new MapSpotAnim(spotanim, this.minusedlevel, x, z, this.getAvH(this.minusedlevel, x, z) - height, this.loopCycle, time);
                this.spotanims.push(spot);
            }
        } else if (opcode === ServerProt.OBJ_REVEAL) {
            const id: number = buf.g2();
            const count: number = buf.g2();
            const pid: number = buf.g2();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE && pid !== this.localPid) {
                const obj: ClientObj = new ClientObj(id, count);
                if (!this.objStacks[this.minusedlevel][x][z]) {
                    this.objStacks[this.minusedlevel][x][z] = new LinkList();
                }

                this.objStacks[this.minusedlevel][x][z]?.push(obj);
                this.showObject(x, z);
            }
        } else if (opcode === ServerProt.P_LOCMERGE) {
            const info: number = buf.g1();
            const shape: number = info >> 2;
            const rotate: number = info & 0x3;
            const layer: number = LocShape.of(shape).layer;

            const id: number = buf.g2();
            const t1: number = buf.g2();
            const t2: number = buf.g2();
            const pid: number = buf.g2();
            let east: number = buf.g1b();
            let south: number = buf.g1b();
            let west: number = buf.g1b();
            let north: number = buf.g1b();

            let player: ClientPlayer | null;
            if (pid === this.localPid) {
                player = this.localPlayer;
            } else {
                player = this.players[pid];
            }

            if (player && this.groundh) {
                const loc: LocType = LocType.get(id);

                const heightSW: number = this.groundh[this.minusedlevel][x][z];
                const heightSE: number = this.groundh[this.minusedlevel][x + 1][z];
                const heightNE: number = this.groundh[this.minusedlevel][x + 1][z + 1];
                const heightNW: number = this.groundh[this.minusedlevel][x][z + 1];

                let model = loc.getModel(shape, rotate, heightSW, heightSE, heightNE, heightNW, -1);
                if (model) {
                    this.locChangeCreate(t2 + 1, -1, 0, layer, z, 0, this.minusedlevel, x, t1 + 1);

                    player.locStartCycle = t1 + this.loopCycle;
                    player.locStopCycle = t2 + this.loopCycle;
                    player.locModel = model;

                    let width: number = loc.width;
                    let height: number = loc.length;
                    if (rotate === LocAngle.NORTH || rotate === LocAngle.SOUTH) {
                        width = loc.length;
                        height = loc.width;
                    }

                    player.locOffsetX = x * 128 + width * 64;
                    player.locOffsetZ = z * 128 + height * 64;
                    player.locOffsetY = this.getAvH(this.minusedlevel, player.locOffsetX, player.locOffsetZ);

                    let tmp: number;
                    if (east > west) {
                        tmp = east;
                        east = west;
                        west = tmp;
                    }

                    if (south > north) {
                        tmp = south;
                        south = north;
                        north = tmp;
                    }

                    player.minTileX = x + east;
                    player.maxTileX = x + west;
                    player.minTileZ = z + south;
                    player.maxTileZ = z + north;
                }
            }
        } else if (opcode === ServerProt.OBJ_COUNT) {
            const type: number = buf.g2();
            const ocount: number = buf.g2();
            const count: number = buf.g2();

            if (x >= 0 && z >= 0 && x < CollisionConstants.SIZE && z < CollisionConstants.SIZE) {
                const list: LinkList | null = this.objStacks[this.minusedlevel][x][z];
                if (list) {
                    for (let obj: ClientObj | null = list.head() as ClientObj | null; obj; obj = list.next() as ClientObj | null) {
                        if (obj.index === (type & 0x7fff) && obj.count === ocount) {
                            obj.count = count;
                            break;
                        }
                    }

                    this.showObject(x, z);
                }
            }
        }
    }

    // jag::oldscape::Client::LocChangeCreate
    private locChangeCreate(endTime: number, type: number, angle: number, layer: number, z: number, shape: number, level: number, x: number, startTime: number): void {
        let loc: LocChange | null = null;
        for (let next: LocChange | null = this.locChanges.head() as LocChange | null; next; next = this.locChanges.next() as LocChange | null) {
            if (next.level === this.minusedlevel && next.x === x && next.z === z && next.layer === layer) {
                loc = next;
                break;
            }
        }

        if (!loc) {
            loc = new LocChange();
            loc.level = level;
            loc.layer = layer;
            loc.x = x;
            loc.z = z;
            this.locChangeSetOld(loc);
            this.locChanges.push(loc);
        }

        loc.newType = type;
        loc.newShape = shape;
        loc.newAngle = angle;
        loc.startTime = startTime;
        loc.endTime = endTime;
    }

    // jag::oldscape::Client::LocChangeSetOld
    private locChangeSetOld(loc: LocChange): void {
        if (!this.world) {
            return;
        }

        let typecode: number = 0;
        let otherId: number = -1;
        let otherShape: number = 0;
        let otherAngle: number = 0;

        if (loc.layer === LocLayer.WALL) {
            typecode = this.world.wallType(loc.level, loc.x, loc.z);
        } else if (loc.layer === LocLayer.WALL_DECOR) {
            typecode = this.world.decorType(loc.level, loc.z, loc.x);
        } else if (loc.layer === LocLayer.GROUND) {
            typecode = this.world.sceneType(loc.level, loc.x, loc.z);
        } else if (loc.layer === LocLayer.GROUND_DECOR) {
            typecode = this.world.gdType(loc.level, loc.x, loc.z);
        }

        if (typecode !== 0) {
            const otherInfo: number = this.world.typecode2(loc.level, loc.x, loc.z, typecode);
            otherId = (typecode >> 14) & 0x7fff;
            otherShape = otherInfo & 0x1f;
            otherAngle = otherInfo >> 6;
        }

        loc.oldType = otherId;
        loc.oldShape = otherShape;
        loc.oldAngle = otherAngle;
    }

    // jag::oldscape::Client::LocChangeUnchecked
    private locChangeUnchecked(level: number, x: number, z: number, id: number, angle: number, shape: number, layer: number): void {
        if (x < 1 || z < 1 || x > 102 || z > 102) {
            return;
        }

        if (Client.lowMem && level !== this.minusedlevel) {
            return;
        }

        if (!this.world) {
            return;
        }

        let typecode: number = 0;
        if (layer === LocLayer.WALL) {
            typecode = this.world.wallType(level, x, z);
        } else if (layer === LocLayer.WALL_DECOR) {
            typecode = this.world.decorType(level, z, x);
        } else if (layer === LocLayer.GROUND) {
            typecode = this.world.sceneType(level, x, z);
        } else if (layer === LocLayer.GROUND_DECOR) {
            typecode = this.world.gdType(level, x, z);
        }

        if (typecode !== 0) {
            const otherInfo: number = this.world.typecode2(level, x, z, typecode);
            const otherId: number = (typecode >> 14) & 0x7fff;
            const otherShape: number = otherInfo & 0x1f;
            const otherAngle: number = otherInfo >> 6;

            if (layer === LocLayer.WALL) {
                this.world?.delWall(level, x, z);

                const type: LocType = LocType.get(otherId);
                if (type.blockwalk) {
                    this.levelCollisionMap[level]?.delWall(x, z, otherShape, otherAngle, type.blockrange);
                }
            } else if (layer === LocLayer.WALL_DECOR) {
                this.world?.delDecor(level, x, z);
            } else if (layer === LocLayer.GROUND) {
                this.world.delLoc(level, x, z);

                const type: LocType = LocType.get(otherId);
                if (x + type.width > CollisionConstants.SIZE - 1 || z + type.width > CollisionConstants.SIZE - 1 || x + type.length > CollisionConstants.SIZE - 1 || z + type.length > CollisionConstants.SIZE - 1) {
                    return;
                }

                if (type.blockwalk) {
                    this.levelCollisionMap[level]?.delLoc(x, z, type.width, type.length, otherAngle, type.blockrange);
                }
            } else if (layer === LocLayer.GROUND_DECOR) {
                this.world?.delGroundDecor(level, x, z);

                const type: LocType = LocType.get(otherId);
                if (type.blockwalk && type.active) {
                    this.levelCollisionMap[level]?.unblockGround(x, z);
                }
            }
        }

        if (id >= 0) {
            let tileLevel: number = level;
            if (this.mapl && level < 3 && (this.mapl[1][x][z] & MapFlag.LinkBelow) !== 0) {
                tileLevel = level + 1;
            }

            if (this.groundh) {
                ClientBuild.changeLocUnchecked(this.loopCycle, level, x, z, this.world, this.groundh, this.levelCollisionMap[level], id, shape, angle, tileLevel);
            }
        }
    }

    // jag::oldscape::Client::ShowObject
    private showObject(x: number, z: number): void {
        const objStacks: LinkList | null = this.objStacks[this.minusedlevel][x][z];
        if (!objStacks) {
            this.world?.delObj(this.minusedlevel, x, z);
            return;
        }

        let topCost: number = -99999999;
        let topObj: ClientObj | null = null;

        for (let obj: ClientObj | null = objStacks.head() as ClientObj | null; obj; obj = objStacks.next() as ClientObj | null) {
            const type: ObjType = ObjType.get(obj.index);
            let cost: number = type.cost;

            if (type.stackable) {
                cost *= obj.count + 1;
            }

            if (cost > topCost) {
                topCost = cost;
                topObj = obj;
            }
        }

        if (!topObj) {
            return; // custom
        }

        objStacks.addHead(topObj);

        let bottomObj: ClientObj | null = null;
        let middleObj: ClientObj | null = null;
        for (let obj: ClientObj | null = objStacks.head() as ClientObj | null; obj; obj = objStacks.next() as ClientObj | null) {
            if (obj.index !== topObj.index && bottomObj === null) {
                bottomObj = obj;
            }

            if (obj.index !== topObj.index && bottomObj && obj.index !== bottomObj.index && middleObj === null) {
                middleObj = obj;
            }
        }

        const typecode: number = (x + (z << 7) + 0x60000000) | 0;
        this.world?.setObj(x, z, this.getAvH(this.minusedlevel, x * 128 + 64, z * 128 + 64), this.minusedlevel, typecode, topObj, middleObj, bottomObj);
    }

    private getPlayerPos(buf: Packet, size: number): void {
        this.entityRemovalCount = 0;
        this.entityUpdateCount = 0;

        this.getPlayerLocal(buf);
        this.getPlayerOldVis(buf);
        this.getPlayerNewVis(buf, size);
        this.getPlayerExtended(buf);

        for (let i: number = 0; i < this.entityRemovalCount; i++) {
            const index: number = this.entityRemovalIds[i];
            const player: ClientPlayer | null = this.players[index];
            if (!player) {
                continue;
            }

            if (player.cycle !== this.loopCycle) {
                this.players[index] = null;
            }
        }

        if (buf.pos !== size) {
            console.error(`eek! Error packet size mismatch in getplayer pos:${buf.pos} psize:${size}`);
            throw new Error('eek');
        }

        for (let index: number = 0; index < this.playerCount; index++) {
            if (!this.players[this.playerIds[index]]) {
                console.error(`eek! ${this.loginUser} null entry in pl list - pos:${index} size:${this.playerCount}`);
                throw new Error('eek');
            }
        }
    }

    private getPlayerLocal(buf: Packet): void {
        buf.bits();

        const info: number = buf.gBit(1);
        if (info !== 0) {
            const op: number = buf.gBit(2);

            if (op === 0) {
                this.entityUpdateIds[this.entityUpdateCount++] = Constants.LOCAL_PLAYER_INDEX;
            } else if (op === 1) {
                const walkDir: number = buf.gBit(3);
                this.localPlayer?.moveCode(false, walkDir);

                const extendedInfo: number = buf.gBit(1);
                if (extendedInfo === 1) {
                    this.entityUpdateIds[this.entityUpdateCount++] = Constants.LOCAL_PLAYER_INDEX;
                }
            } else if (op === 2) {
                const walkDir: number = buf.gBit(3);
                this.localPlayer?.moveCode(true, walkDir);

                const runDir: number = buf.gBit(3);
                this.localPlayer?.moveCode(true, runDir);

                const extendedInfo: number = buf.gBit(1);
                if (extendedInfo === 1) {
                    this.entityUpdateIds[this.entityUpdateCount++] = Constants.LOCAL_PLAYER_INDEX;
                }
            } else if (op === 3) {
                this.minusedlevel = buf.gBit(2);
                const localX: number = buf.gBit(7);
                const localZ: number = buf.gBit(7);
                const jump: number = buf.gBit(1);

                this.localPlayer?.teleport(jump === 1, localX, localZ);

                const extendedInfo: number = buf.gBit(1);
                if (extendedInfo === 1) {
                    this.entityUpdateIds[this.entityUpdateCount++] = Constants.LOCAL_PLAYER_INDEX;
                }
            }
        }
    }

    private getPlayerOldVis(buf: Packet): void {
        const count: number = buf.gBit(8);

        if (count < this.playerCount) {
            for (let i: number = count; i < this.playerCount; i++) {
                this.entityRemovalIds[this.entityRemovalCount++] = this.playerIds[i];
            }
        }

        if (count > this.playerCount) {
            console.error(`eek! ${this.loginUser} Too many players`);
            throw new Error();
        }

        this.playerCount = 0;
        for (let i: number = 0; i < count; i++) {
            const index: number = this.playerIds[i];
            const player: ClientPlayer | null = this.players[index];

            const info: number = buf.gBit(1);
            if (info === 0) {
                this.playerIds[this.playerCount++] = index;
                if (player) {
                    player.cycle = this.loopCycle;
                }
            } else {
                const op: number = buf.gBit(2);

                if (op === 0) {
                    this.playerIds[this.playerCount++] = index;
                    if (player) {
                        player.cycle = this.loopCycle;
                    }
                    this.entityUpdateIds[this.entityUpdateCount++] = index;
                } else if (op === 1) {
                    this.playerIds[this.playerCount++] = index;
                    if (player) {
                        player.cycle = this.loopCycle;
                    }

                    const walkDir: number = buf.gBit(3);
                    player?.moveCode(false, walkDir);

                    const extendedInfo: number = buf.gBit(1);
                    if (extendedInfo === 1) {
                        this.entityUpdateIds[this.entityUpdateCount++] = index;
                    }
                } else if (op === 2) {
                    this.playerIds[this.playerCount++] = index;
                    if (player) {
                        player.cycle = this.loopCycle;
                    }

                    const walkDir: number = buf.gBit(3);
                    player?.moveCode(true, walkDir);

                    const runDir: number = buf.gBit(3);
                    player?.moveCode(true, runDir);

                    const extendedInfo: number = buf.gBit(1);
                    if (extendedInfo === 1) {
                        this.entityUpdateIds[this.entityUpdateCount++] = index;
                    }
                } else if (op === 3) {
                    this.entityRemovalIds[this.entityRemovalCount++] = index;
                }
            }
        }
    }

    private getPlayerNewVis(buf: Packet, size: number): void {
        while (buf.bitPos + 10 < size * 8) {
            let index = buf.gBit(11);
            if (index === 2047) {
                break;
            }

            if (!this.players[index]) {
                this.players[index] = new ClientPlayer();

                const appearance: Packet | null = this.playerAppearanceBuffer[index];
                if (appearance) {
                    this.players[index]?.setAppearance(appearance);
                }
            }

            this.playerIds[this.playerCount++] = index;
            const player: ClientPlayer | null = this.players[index];
            if (player) {
                player.cycle = this.loopCycle;
            }

            let dx: number = buf.gBit(5);
            if (dx > 15) {
                dx -= 32;
            }

            let dz: number = buf.gBit(5);
            if (dz > 15) {
                dz -= 32;
            }

            const jump: number = buf.gBit(1);

            if (this.localPlayer) {
                player?.teleport(jump === 1, this.localPlayer.routeTileX[0] + dx, this.localPlayer.routeTileZ[0] + dz);
            }

            const extendedInfo: number = buf.gBit(1);
            if (extendedInfo === 1) {
                this.entityUpdateIds[this.entityUpdateCount++] = index;
            }
        }

        buf.bytes();
    }

    // jag::oldscape::ReceivePlayerPositions::GetPlayerPositionsExtended
    private getPlayerExtended(buf: Packet): void {
        for (let i: number = 0; i < this.entityUpdateCount; i++) {
            const index: number = this.entityUpdateIds[i];
            const player: ClientPlayer | null = this.players[index];
            if (!player) {
                continue;
            }

            let mask: number = buf.g1();
            if ((mask & PlayerUpdate.BIG_UPDATE) !== 0) {
                mask += buf.g1() << 8;
            }

            this.getPlayerExtendedDecode(player, index, mask, buf);
        }
    }

    // jag::oldscape::ReceivePlayerPositions::DecodeExtend
    private getPlayerExtendedDecode(player: ClientPlayer, index: number, mask: number, buf: Packet): void {
        if ((mask & PlayerUpdate.APPEARANCE) !== 0) {
            const length: number = buf.g1();

            const data: Uint8Array = new Uint8Array(length);
            const appearance: Packet = new Packet(data);
            buf.gdata(length, 0, data);

            this.playerAppearanceBuffer[index] = appearance;
            player.setAppearance(appearance);
        }

        if ((mask & PlayerUpdate.ANIM) !== 0) {
            let seqId: number = buf.g2();
            if (seqId === 65535) {
                seqId = -1;
            }

            if (seqId === player.primarySeqId) {
                player.primarySeqLoop = 0;
            }

            const delay: number = buf.g1();
            if (player.primarySeqId === seqId && seqId !== -1) {
                const restartMode = SeqType.list[seqId].duplicatebehavior;

                if (restartMode == RestartMode.RESET) {
                    player.primarySeqFrame = 0;
                    player.primarySeqCycle = 0;
                    player.primarySeqDelay = delay;
                    player.primarySeqLoop = 0;
                } else if (restartMode == RestartMode.RESETLOOP) {
                    player.primarySeqLoop = 0;
                }
            } else if (seqId === -1 || player.primarySeqId === -1 || SeqType.list[seqId].priority >= SeqType.list[player.primarySeqId].priority) {
                player.primarySeqId = seqId;
                player.primarySeqFrame = 0;
                player.primarySeqCycle = 0;
                player.primarySeqDelay = delay;
                player.primarySeqLoop = 0;
                player.preanimRouteLength = player.routeLength;
            }
        }

        if ((mask & PlayerUpdate.FACEENTITY) !== 0) {
            player.faceEntity = buf.g2();
            if (player.faceEntity === 65535) {
                player.faceEntity = -1;
            }
        }

        if ((mask & PlayerUpdate.SAY) !== 0) {
            player.chatMessage = buf.gjstr();
            player.chatColour = 0;
            player.chatEffect = 0;
            player.chatTimer = 150;

            if (player.name) {
                this.addChat(2, player.chatMessage, player.name);
            }
        }

        if ((mask & PlayerUpdate.HITMARK) !== 0) {
            const damage = buf.g1();
            const damageType = buf.g1();

            player.addHitmark(this.loopCycle, damageType, damage);
            player.combatCycle = this.loopCycle + 400;
            player.health = buf.g1();
            player.totalHealth = buf.g1();
        }

        if ((mask & PlayerUpdate.FACESQUARE) !== 0) {
            player.faceSquareX = buf.g2();
            player.faceSquareZ = buf.g2();
        }

        if ((mask & PlayerUpdate.CHAT) !== 0) {
            const colourEffect: number = buf.g2();
            const type: number = buf.g1();
            const length: number = buf.g1();
            const start: number = buf.pos;

            if (player.name && player.ready) {
                const username: bigint = JString.toBase37(player.name);
                let ignored: boolean = false;

                if (type <= 1) {
                    for (let i: number = 0; i < this.ignoreCount; i++) {
                        if (this.ignoreName37[i] === username) {
                            ignored = true;
                            break;
                        }
                    }
                }

                if (!ignored && this.chatDisabled === 0) {
                    try {
                        const uncompressed: string = WordPack.unpack(buf, length);
                        const filtered: string = WordFilter.filter(uncompressed);
                        player.chatMessage = filtered;
                        player.chatColour = colourEffect >> 8;
                        player.chatEffect = colourEffect & 0xff;
                        player.chatTimer = 150;

                        if (type === 2 || type === 3) {
                            this.addChat(1, filtered, '@cr2@' + player.name);
                        } else if (type === 1) {
                            this.addChat(1, filtered, '@cr1@' + player.name);
                        } else {
                            this.addChat(2, filtered, player.name);
                        }
                    } catch (e) {
                        // signlink.reporterror('cde2');
                    }
                }
            }

            buf.pos = start + length;
        }

        if ((mask & PlayerUpdate.SPOTANIM) !== 0) {
            player.spotanimId = buf.g2();
            const heightDelay: number = buf.g4();

            player.spotanimHeight = heightDelay >> 16;
            player.spotanimLastCycle = this.loopCycle + (heightDelay & 0xffff);
            player.spotanimFrame = 0;
            player.spotanimCycle = 0;

            if (player.spotanimLastCycle > this.loopCycle) {
                player.spotanimFrame = -1;
            }

            if (player.spotanimId === 65535) {
                player.spotanimId = -1;
            }
        }

        if ((mask & PlayerUpdate.EXACTMOVE) !== 0) {
            player.exactMoveStartSceneTileX = buf.g1();
            player.exactMoveStartSceneTileZ = buf.g1();
            player.exactMoveEndSceneTileX = buf.g1();
            player.exactMoveEndSceneTileZ = buf.g1();
            player.exactMoveEndCycle = buf.g2() + this.loopCycle;
            player.exactMoveStartCycle = buf.g2() + this.loopCycle;
            player.exactMoveFacing = buf.g1();

            player.abortRoute();
        }

        if ((mask & PlayerUpdate.HITMARK2) !== 0) {
            const damage = buf.g1();
            const damageType = buf.g1();

            player.addHitmark(this.loopCycle, damageType, damage);
            player.combatCycle = this.loopCycle + 400;
            player.health = buf.g1();
            player.totalHealth = buf.g1();
        }
    }

    // jag::oldscape::Client::GetNPCPos
    private getNpcPos(buf: Packet, size: number): void {
        this.entityRemovalCount = 0;
        this.entityUpdateCount = 0;

        this.getNpcPosOldVis(buf);
        this.getNpcPosNewVis(buf, size);
        this.getNpcPosExtended(buf);

        for (let i: number = 0; i < this.entityRemovalCount; i++) {
            const index: number = this.entityRemovalIds[i];
            const npc: ClientNpc | null = this.npc[index];
            if (!npc) {
                continue;
            }

            if (npc.cycle !== this.loopCycle) {
                npc.type = null;
                this.npc[index] = null;
            }
        }

        if (buf.pos !== size) {
            console.error(`eek! ${this.loginUser} size mismatch in getnpcpos - pos:${buf.pos} psize:${size}`);
            throw new Error('eek');
        }

        for (let i: number = 0; i < this.npcCount; i++) {
            if (!this.npc[this.npcIds[i]]) {
                console.error(`eek! ${this.loginUser} null entry in npc list - pos:${i} size:${this.npcCount}`);
                throw new Error('eek');
            }
        }
    }

    // jag::oldscape::Client::GetNPCPosOldVis
    private getNpcPosOldVis(buf: Packet): void {
        buf.bits();

        const count: number = buf.gBit(8);
        if (count < this.npcCount) {
            for (let i: number = count; i < this.npcCount; i++) {
                this.entityRemovalIds[this.entityRemovalCount++] = this.npcIds[i];
            }
        }

        if (count > this.npcCount) {
            console.error(`eek! ${this.loginUser} Too many npcs`);
            throw new Error('eek');
        }

        this.npcCount = 0;
        for (let i: number = 0; i < count; i++) {
            const index: number = this.npcIds[i];
            const npc: ClientNpc | null = this.npc[index];

            const info: number = buf.gBit(1);
            if (info === 0) {
                this.npcIds[this.npcCount++] = index;
                if (npc) {
                    npc.cycle = this.loopCycle;
                }
            } else {
                const op: number = buf.gBit(2);

                if (op === 0) {
                    this.npcIds[this.npcCount++] = index;
                    if (npc) {
                        npc.cycle = this.loopCycle;
                    }
                    this.entityUpdateIds[this.entityUpdateCount++] = index;
                } else if (op === 1) {
                    this.npcIds[this.npcCount++] = index;
                    if (npc) {
                        npc.cycle = this.loopCycle;
                    }

                    const walkDir: number = buf.gBit(3);
                    npc?.moveCode(false, walkDir);

                    const extendedInfo: number = buf.gBit(1);
                    if (extendedInfo === 1) {
                        this.entityUpdateIds[this.entityUpdateCount++] = index;
                    }
                } else if (op === 2) {
                    this.npcIds[this.npcCount++] = index;
                    if (npc) {
                        npc.cycle = this.loopCycle;
                    }

                    const walkDir: number = buf.gBit(3);
                    npc?.moveCode(true, walkDir);

                    const runDir: number = buf.gBit(3);
                    npc?.moveCode(true, runDir);

                    const extendedInfo: number = buf.gBit(1);
                    if (extendedInfo === 1) {
                        this.entityUpdateIds[this.entityUpdateCount++] = index;
                    }
                } else if (op === 3) {
                    this.entityRemovalIds[this.entityRemovalCount++] = index;
                }
            }
        }
    }

    // jag::oldscape::Client::GetNPCPosNewVis
    private getNpcPosNewVis(buf: Packet, size: number): void {
        while (buf.bitPos + 21 < size * 8) {
            const index: number = buf.gBit(14);
            if (index === 16383) {
                break;
            }

            if (!this.npc[index]) {
                this.npc[index] = new ClientNpc();
            }

            const npc: ClientNpc | null = this.npc[index];
            this.npcIds[this.npcCount++] = index;

            if (npc) {
                npc.cycle = this.loopCycle;
                npc.type = NpcType.get(buf.gBit(11));
                npc.size = npc.type.size;
                npc.walkanim = npc.type.walkanim;
                npc.walkanim_b = npc.type.walkanim_b;
                npc.walkanim_l = npc.type.walkanim_r;
                npc.walkanim_r = npc.type.walkanim_l;
                npc.readyanim = npc.type.readyanim;
            } else {
                buf.gBit(11);
            }

            let dx: number = buf.gBit(5);
            if (dx > 15) {
                dx -= 32;
            }

            let dz: number = buf.gBit(5);
            if (dz > 15) {
                dz -= 32;
            }

            if (this.localPlayer) {
                npc?.teleport(false, this.localPlayer.routeTileX[0] + dx, this.localPlayer.routeTileZ[0] + dz);
            }

            const extendedInfo: number = buf.gBit(1);
            if (extendedInfo === 1) {
                this.entityUpdateIds[this.entityUpdateCount++] = index;
            }
        }

        buf.bytes();
    }

    // jag::oldscape::Client::GetNPCPosExtended
    private getNpcPosExtended(buf: Packet): void {
        for (let i: number = 0; i < this.entityUpdateCount; i++) {
            const id: number = this.entityUpdateIds[i];
            const npc: ClientNpc | null = this.npc[id];
            if (!npc) {
                continue;
            }

            const mask: number = buf.g1();

            if ((mask & NpcUpdate.HITMARK2) !== 0) {
                const damage = buf.g1();
                const damageType = buf.g1();

                npc.addHitmark(this.loopCycle, damageType, damage);
                npc.combatCycle = this.loopCycle + 400;
                npc.health = buf.g1();
                npc.totalHealth = buf.g1();
            }

            if ((mask & NpcUpdate.ANIM) !== 0) {
                let anim: number = buf.g2();
                if (anim === 65535) {
                    anim = -1;
                }

                if (anim === npc.primarySeqId) {
                    npc.primarySeqLoop = 0;
                }

                const delay: number = buf.g1();
                if (npc.primarySeqId === anim && anim !== -1) {
                    const restartMode = SeqType.list[anim].duplicatebehavior;

                    if (restartMode == RestartMode.RESET) {
                        npc.primarySeqFrame = 0;
                        npc.primarySeqCycle = 0;
                        npc.primarySeqDelay = delay;
                        npc.primarySeqLoop = 0;
                    } else if (restartMode == RestartMode.RESETLOOP) {
                        npc.primarySeqLoop = 0;
                    }
                } else if (anim === -1 || npc.primarySeqId === -1 || SeqType.list[anim].priority >= SeqType.list[npc.primarySeqId].priority) {
                    npc.primarySeqId = anim;
                    npc.primarySeqFrame = 0;
                    npc.primarySeqCycle = 0;
                    npc.primarySeqDelay = delay;
                    npc.primarySeqLoop = 0;
                    npc.preanimRouteLength = npc.routeLength;
                }
            }

            if ((mask & NpcUpdate.FACEENTITY) !== 0) {
                npc.faceEntity = buf.g2();
                if (npc.faceEntity === 65535) {
                    npc.faceEntity = -1;
                }
            }

            if ((mask & NpcUpdate.SAY) !== 0) {
                npc.chatMessage = buf.gjstr();
                npc.chatTimer = 100;
            }

            if ((mask & NpcUpdate.HITMARK) !== 0) {
                const damage = buf.g1();
                const damageType = buf.g1();

                npc.addHitmark(this.loopCycle, damageType, damage);
                npc.combatCycle = this.loopCycle + 400;
                npc.health = buf.g1();
                npc.totalHealth = buf.g1();
            }

            if ((mask & NpcUpdate.CHANGETYPE) !== 0) {
                npc.type = NpcType.get(buf.g2());

                npc.walkanim = npc.type.walkanim;
                npc.walkanim_b = npc.type.walkanim_b;
                npc.walkanim_l = npc.type.walkanim_r;
                npc.walkanim_r = npc.type.walkanim_l;
                npc.readyanim = npc.type.readyanim;
            }

            if ((mask & NpcUpdate.SPOTANIM) !== 0) {
                npc.spotanimId = buf.g2();
                const info: number = buf.g4();

                npc.spotanimHeight = info >> 16;
                npc.spotanimLastCycle = this.loopCycle + (info & 0xffff);
                npc.spotanimFrame = 0;
                npc.spotanimCycle = 0;

                if (npc.spotanimLastCycle > this.loopCycle) {
                    npc.spotanimFrame = -1;
                }

                if (npc.spotanimId === 65535) {
                    npc.spotanimId = -1;
                }
            }

            if ((mask & NpcUpdate.FACESQUARE) !== 0) {
                npc.faceSquareX = buf.g2();
                npc.faceSquareZ = buf.g2();
            }
        }
    }

    private showContextMenu(): void {
        let width: number = 0;
        if (this.fontBold12) {
            width = this.fontBold12.stringWid('Choose Option');
            let maxWidth: number;
            for (let i: number = 0; i < this.menuSize; i++) {
                maxWidth = this.fontBold12.stringWid(this.menuOption[i]);
                if (maxWidth > width) {
                    width = maxWidth;
                }
            }
        }
        width += 8;

        const height: number = this.menuSize * 15 + 21;

        let x: number;
        let y: number;

        // the main viewport area
        if (this.mouseClickX > 4 && this.mouseClickY > 4 && this.mouseClickX < 516 && this.mouseClickY < 338) {
            x = this.mouseClickX - ((width / 2) | 0) - 4;
            if (x + width > 512) {
                x = 512 - width;
            }
            if (x < 0) {
                x = 0;
            }

            y = this.mouseClickY - 4;
            if (y + height > 334) {
                y = 334 - height;
            }
            if (y < 0) {
                y = 0;
            }

            this.menuVisible = true;
            this.menuArea = 0;
            this.menuX = x;
            this.menuY = y;
            this.menuWidth = width;
            this.menuHeight = this.menuSize * 15 + 22;
        }

        // the sidebar/tabs area
        if (this.mouseClickX > 553 && this.mouseClickY > 205 && this.mouseClickX < 743 && this.mouseClickY < 466) {
            x = this.mouseClickX - ((width / 2) | 0) - 553;
            if (x < 0) {
                x = 0;
            } else if (x + width > 190) {
                x = 190 - width;
            }

            y = this.mouseClickY - 205;
            if (y < 0) {
                y = 0;
            } else if (y + height > 261) {
                y = 261 - height;
            }

            this.menuVisible = true;
            this.menuArea = 1;
            this.menuX = x;
            this.menuY = y;
            this.menuWidth = width;
            this.menuHeight = this.menuSize * 15 + 22;
        }

        // the chatbox area
        if (this.mouseClickX > 17 && this.mouseClickY > 357 && this.mouseClickX < 496 && this.mouseClickY < 453) {
            x = this.mouseClickX - ((width / 2) | 0) - 17;
            if (x < 0) {
                x = 0;
            } else if (x + width > 479) {
                x = 479 - width;
            }

            y = this.mouseClickY - 357;
            if (y < 0) {
                y = 0;
            } else if (y + height > 96) {
                y = 96 - height;
            }

            this.menuVisible = true;
            this.menuArea = 2;
            this.menuX = x;
            this.menuY = y;
            this.menuWidth = width;
            this.menuHeight = this.menuSize * 15 + 22;
        }
    }

    private isAddFriendOption(option: number): boolean {
        if (option < 0) {
            return false;
        }

        let action: number = this.menuAction[option];
        if (action >= MenuAction._PRIORITY) {
            action -= MenuAction._PRIORITY;
        }

        return action === MenuAction.FRIENDLIST_ADD;
    }

    private useMenuOption(optionId: number): void {
        if (optionId < 0) {
            return;
        }

        if (this.chatbackInputOpen) {
            this.chatbackInputOpen = false;
            this.redrawChatback = true;
        }

        let action: number = this.menuAction[optionId];
        const a: number = this.menuParamA[optionId];
        const b: number = this.menuParamB[optionId];
        const c: number = this.menuParamC[optionId];

        if (action >= MenuAction._PRIORITY) {
            action -= MenuAction._PRIORITY;
        }

        if (action === MenuAction.OPOBJ1 || action === MenuAction.OPOBJ2 || action === MenuAction.OPOBJ3 || action === MenuAction.OPOBJ4 || action === MenuAction.OPOBJ5) {
            if (this.localPlayer) {
                const success: boolean = this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 0, 0, 0, 0, 0, false);
                if (!success) {
                    this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 1, 1, 0, 0, 0, false);
                }

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                if (action === MenuAction.OPOBJ1) {
                    if ((b & 0x3) == 0) {
                        Client.oplogic7++;
                    }
                    if (Client.oplogic7 >= 123) {
                        this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC7);
                        this.out.p4(0);
                    }

                    this.out.pIsaac(ClientProt.OPOBJ1);
                }

                if (action === MenuAction.OPOBJ2) {
                    this.out.pIsaac(ClientProt.OPOBJ2);
                }

                if (action === MenuAction.OPOBJ3) {
                    this.out.pIsaac(ClientProt.OPOBJ3);
                }

                if (action === MenuAction.OPOBJ4) {
                    Client.oplogic8 += c;
                    if (Client.oplogic8 >= 75) {
                        this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC8);
                        this.out.p1(19);
                    }

                    this.out.pIsaac(ClientProt.OPOBJ4);
                }

                if (action === MenuAction.OPOBJ5) {
                    Client.oplogic3 += this.mapBuildBaseZ;
                    if (Client.oplogic3 >= 118) {
                        this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC3);
                        this.out.p4(0);
                    }

                    this.out.pIsaac(ClientProt.OPOBJ5);
                }

                this.out.p2(b + this.mapBuildBaseX);
                this.out.p2(c + this.mapBuildBaseZ);
                this.out.p2(a);
            }
        }

        if (action === MenuAction.OPOBJ6) {
            const obj: ObjType = ObjType.get(a);
            let examine: string;

            if (!obj.desc) {
                examine = "It's a " + obj.name + '.';
            } else {
                examine = obj.desc;
            }

            this.addChat(0, examine, '');
        }

        if (action === MenuAction.OPOBJT) {
            if (this.localPlayer) {
                const success: boolean = this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 0, 0, 0, 0, 0, false);
                if (!success) {
                    this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 1, 1, 0, 0, 0, false);
                }

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPOBJT);
                this.out.p2(b + this.mapBuildBaseX);
                this.out.p2(c + this.mapBuildBaseZ);
                this.out.p2(a);
                this.out.p2(this.activeSpellId);
            }
        }

        if (action === MenuAction.OPOBJU) {
            if (this.localPlayer) {
                const success: boolean = this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 0, 0, 0, 0, 0, false);
                if (!success) {
                    this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], b, c, 2, 1, 1, 0, 0, 0, false);
                }

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPOBJU);
                this.out.p2(b + this.mapBuildBaseX);
                this.out.p2(c + this.mapBuildBaseZ);
                this.out.p2(a);
                this.out.p2(this.objLayerId);
                this.out.p2(this.objSelectedSlot);
                this.out.p2(this.objSelectedLayerId);
            }
        }

        if (action === MenuAction.OPNPC1 || action === MenuAction.OPNPC2 || action === MenuAction.OPNPC3 || action === MenuAction.OPNPC4 || action === MenuAction.OPNPC5) {
            const npc: ClientNpc | null = this.npc[a];
            if (npc && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], npc.routeTileX[0], npc.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                if (action === MenuAction.OPNPC1) {
                    this.out.pIsaac(ClientProt.OPNPC1);
                }

                if (action === MenuAction.OPNPC2) {
                    this.out.pIsaac(ClientProt.OPNPC2);
                }

                if (action === MenuAction.OPNPC3) {
                    this.out.pIsaac(ClientProt.OPNPC3);
                }

                if (action === MenuAction.OPNPC4) {
                    this.out.pIsaac(ClientProt.OPNPC4);
                }

                if (action === MenuAction.OPNPC5) {
                    this.out.pIsaac(ClientProt.OPNPC5);
                }

                this.out.p2(a);
            }
        }

        if (action === MenuAction.OPNPC6) {
            const npc: ClientNpc | null = this.npc[a];
            if (npc && npc.type) {
                let examine: string;

                if (!npc.type.desc) {
                    examine = "It's a " + npc.type.name + '.';
                } else {
                    examine = npc.type.desc;
                }

                this.addChat(0, examine, '');
            }
        }

        if (action === MenuAction.OPNPCT) {
            const npc: ClientNpc | null = this.npc[a];
            if (npc && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], npc.routeTileX[0], npc.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPNPCT);
                this.out.p2(a);
                this.out.p2(this.activeSpellId);
            }
        }

        if (action === MenuAction.OPNPCU) {
            const npc: ClientNpc | null = this.npc[a];

            if (npc && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], npc.routeTileX[0], npc.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPNPCU);
                this.out.p2(a);
                this.out.p2(this.objLayerId);
                this.out.p2(this.objSelectedSlot);
                this.out.p2(this.objSelectedLayerId);
            }
        }

        if (action === MenuAction.OPLOC1) {
            this.interactWithLoc(ClientProt.OPLOC1, b, c, a);
        }

        if (action === MenuAction.OPLOC2) {
            Client.oplogic1 += c;
            if (Client.oplogic1 >= 139) {
                this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC1);
                this.out.p4(0);
            }

            this.interactWithLoc(ClientProt.OPLOC2, b, c, a);
        }

        if (action === MenuAction.OPLOC3) {
            Client.oplogic2++;
            if (Client.oplogic2 >= 124) {
                this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC2);
                this.out.p2(37954);
            }

            this.interactWithLoc(ClientProt.OPLOC3, b, c, a);
        }

        if (action === MenuAction.OPLOC4) {
            this.interactWithLoc(ClientProt.OPLOC4, b, c, a);
        }

        if (action === MenuAction.OPLOC5) {
            this.interactWithLoc(ClientProt.OPLOC5, b, c, a);
        }

        if (action === MenuAction.OPLOC6) {
            const locId: number = (a >> 14) & 0x7fff;
            const loc: LocType = LocType.get(locId);

            let examine: string;
            if (!loc.desc) {
                examine = "It's a " + loc.name + '.';
            } else {
                examine = loc.desc;
            }

            this.addChat(0, examine, '');
        }

        if (action === MenuAction.OPLOCT) {
            if (this.interactWithLoc(ClientProt.OPLOCT, b, c, a)) {
                this.out.p2(this.activeSpellId);
            }
        }

        if (action === MenuAction.OPLOCU) {
            if (this.interactWithLoc(ClientProt.OPLOCU, b, c, a)) {
                this.out.p2(this.objLayerId);
                this.out.p2(this.objSelectedSlot);
                this.out.p2(this.objSelectedLayerId);
            }
        }

        if (action === MenuAction.OPPLAYER1 || action === MenuAction.OPPLAYER2 || action === MenuAction.OPPLAYER3 || action === MenuAction.OPPLAYER4 || action === MenuAction.OPPLAYER5) {
            const player: ClientPlayer | null = this.players[a];
            if (player && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], player.routeTileX[0], player.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                if (action === MenuAction.OPPLAYER1) {
                    Client.oplogic4++;
                    if (Client.oplogic4 >= 52) {
                        this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC4);
                        this.out.p1(131);
                    }

                    this.out.pIsaac(ClientProt.OPPLAYER1);
                }

                if (action === MenuAction.OPPLAYER2) {
                    this.out.pIsaac(ClientProt.OPPLAYER2);
                }

                if (action === MenuAction.OPPLAYER3) {
                    this.out.pIsaac(ClientProt.OPPLAYER3);
                }

                if (action === MenuAction.OPPLAYER4) {
                    Client.oplogic5 += a;
                    if (Client.oplogic5 >= 66) {
                        this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC5);
                        this.out.p1(154);
                    }

                    this.out.pIsaac(ClientProt.OPPLAYER4);
                }

                if (action === MenuAction.OPPLAYER5) {
                    this.out.pIsaac(ClientProt.OPPLAYER5);
                }

                this.out.p2(a);
            }
        }

        if (action === MenuAction.OPPLAYER_TRADEREQ || action === MenuAction.OPPLAYER_DUELREQ) {
            let option: string = this.menuOption[optionId];
            const tag: number = option.indexOf('@whi@');

            if (tag !== -1) {
                option = option.substring(tag + 5).trim();
                const name: string = JString.formatName(JString.fromBase37(JString.toBase37(option)));
                let found: boolean = false;

                for (let i: number = 0; i < this.playerCount; i++) {
                    const player: ClientPlayer | null = this.players[this.playerIds[i]];

                    if (player && player.name && player.name.toLowerCase() === name.toLowerCase() && this.localPlayer) {
                        this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], player.routeTileX[0], player.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                        if (action === MenuAction.OPPLAYER_TRADEREQ) {
                            Client.oplogic5 += a;
                            if (Client.oplogic5 >= 66) {
                                this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC5);
                                this.out.p1(154);
                            }

                            this.out.pIsaac(ClientProt.OPPLAYER4);
                        }

                        if (action === MenuAction.OPPLAYER_DUELREQ) {
                            Client.oplogic4++;
                            if (Client.oplogic4 >= 52) {
                                this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC4);
                                this.out.p1(131);
                            }

                            this.out.pIsaac(ClientProt.OPPLAYER1);
                        }

                        this.out.p2(this.playerIds[i]);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    this.addChat(0, 'Unable to find ' + name, '');
                }
            }
        }

        if (action === MenuAction.OPPLAYERT) {
            const player: ClientPlayer | null = this.players[a];

            if (player && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], player.routeTileX[0], player.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPPLAYERT);
                this.out.p2(a);
                this.out.p2(this.activeSpellId);
            }
        }

        if (action === MenuAction.OPPLAYERU) {
            const player: ClientPlayer | null = this.players[a];
            if (player && this.localPlayer) {
                this.tryMove(this.localPlayer.routeTileX[0], this.localPlayer.routeTileZ[0], player.routeTileX[0], player.routeTileZ[0], 2, 1, 1, 0, 0, 0, false);

                this.crossX = this.mouseClickX;
                this.crossY = this.mouseClickY;
                this.crossMode = 2;
                this.crossCycle = 0;

                this.out.pIsaac(ClientProt.OPPLAYERU);
                this.out.p2(a);
                this.out.p2(this.objLayerId);
                this.out.p2(this.objSelectedSlot);
                this.out.p2(this.objSelectedLayerId);
            }
        }

        if (action === MenuAction.OPHELD1 || action === MenuAction.OPHELD2 || action === MenuAction.OPHELD3 || action === MenuAction.OPHELD4 || action === MenuAction.OPHELD5) {
            if (action === MenuAction.OPHELD1) {
                this.out.pIsaac(ClientProt.OPHELD1);
            }

            if (action === MenuAction.OPHELD2) {
                this.out.pIsaac(ClientProt.OPHELD2);
            }

            if (action === MenuAction.OPHELD3) {
                this.out.pIsaac(ClientProt.OPHELD3);
            }

            if (action === MenuAction.OPHELD4) {
                Client.oplogic9++;
                if (Client.oplogic9 >= 116) {
                    this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC9);
                    this.out.p3(13018169);
                }

                this.out.pIsaac(ClientProt.OPHELD4);
            }

            if (action === MenuAction.OPHELD5) {
                this.out.pIsaac(ClientProt.OPHELD5);
            }

            this.out.p2(a);
            this.out.p2(b);
            this.out.p2(c);

            this.selectedCycle = 0;
            this.selectedLayerId = c;
            this.selectedItem = b;
            this.selectedArea = 2;

            if (IfType.list[c].layerId === this.mainLayerId) {
                this.selectedArea = 1;
            }

            if (IfType.list[c].layerId === this.chatLayerId) {
                this.selectedArea = 3;
            }
        }

        if (action === MenuAction.OPHELD6) {
            const obj: ObjType = ObjType.get(a);
            let examine: string;

            if (c >= 100000) {
                examine = c + ' x ' + obj.name;
            } else if (!obj.desc) {
                examine = "It's a " + obj.name + '.';
            } else {
                examine = obj.desc;
            }

            this.addChat(0, examine, '');
        }

        if (action === MenuAction.OPHELDT_START) {
            this.objSelected = 1;
            this.objSelectedSlot = b;
            this.objSelectedLayerId = c;
            this.objLayerId = a;
            this.objSelectedName = ObjType.get(a).name;
            this.spellSelected = 0;
            this.redrawSidebar = true;
            return;
        }

        if (action === MenuAction.OPHELDT_SELECT) {
            const com: IfType = IfType.list[c];
            this.spellSelected = 1;
            this.activeSpellId = c;
            this.activeSpellFlags = com.targetMask;
            this.objSelected = 0;
            this.redrawSidebar = true;

            let prefix: string | null = com.targetVerb;
            if (prefix && prefix.indexOf(' ') !== -1) {
                prefix = prefix.substring(0, prefix.indexOf(' '));
            }

            let suffix: string | null = com.targetVerb;
            if (suffix && suffix.indexOf(' ') !== -1) {
                suffix = suffix.substring(suffix.indexOf(' ') + 1);
            }

            this.spellCaption = prefix + ' ' + com.targetText + ' ' + suffix;

            if (this.activeSpellFlags === 0x10) {
                this.redrawSidebar = true;
                this.sideTab = 3;
                this.redrawSideicons = true;
            }

            return;
        }

        if (action === MenuAction.OPHELDT) {
            this.out.pIsaac(ClientProt.OPHELDT);
            this.out.p2(a);
            this.out.p2(b);
            this.out.p2(c);
            this.out.p2(this.activeSpellId);

            this.selectedCycle = 0;
            this.selectedLayerId = c;
            this.selectedItem = b;
            this.selectedArea = 2;

            if (IfType.list[c].layerId === this.mainLayerId) {
                this.selectedArea = 1;
            }

            if (IfType.list[c].layerId === this.chatLayerId) {
                this.selectedArea = 3;
            }
        }

        if (action === MenuAction.OPHELDU) {
            this.out.pIsaac(ClientProt.OPHELDU);
            this.out.p2(a);
            this.out.p2(b);
            this.out.p2(c);
            this.out.p2(this.objLayerId);
            this.out.p2(this.objSelectedSlot);
            this.out.p2(this.objSelectedLayerId);

            this.selectedCycle = 0;
            this.selectedLayerId = c;
            this.selectedItem = b;
            this.selectedArea = 2;

            if (IfType.list[c].layerId === this.mainLayerId) {
                this.selectedArea = 1;
            }

            if (IfType.list[c].layerId === this.chatLayerId) {
                this.selectedArea = 3;
            }
        }

        if (action === MenuAction.INV_BUTTON1 || action === MenuAction.INV_BUTTON2 || action === MenuAction.INV_BUTTON3 || action === MenuAction.INV_BUTTON4 || action === MenuAction.INV_BUTTON5) {
            if (action === MenuAction.INV_BUTTON1) {
                if ((a & 0x3) == 0) {
                    Client.oplogic6++;
                }
                if (Client.oplogic6 >= 133) {
                    this.out.pIsaac(ClientProt.ANTICHEAT_OPLOGIC6);
                    this.out.p2(6118);
                }

                this.out.pIsaac(ClientProt.INV_BUTTON1);
            }

            if (action === MenuAction.INV_BUTTON2) {
                this.out.pIsaac(ClientProt.INV_BUTTON2);
            }

            if (action === MenuAction.INV_BUTTON3) {
                this.out.pIsaac(ClientProt.INV_BUTTON3);
            }

            if (action === MenuAction.INV_BUTTON4) {
                this.out.pIsaac(ClientProt.INV_BUTTON4);
            }

            if (action === MenuAction.INV_BUTTON5) {
                this.out.pIsaac(ClientProt.INV_BUTTON5);
            }

            this.out.p2(a);
            this.out.p2(b);
            this.out.p2(c);

            this.selectedCycle = 0;
            this.selectedLayerId = c;
            this.selectedItem = b;
            this.selectedArea = 2;

            if (IfType.list[c].layerId === this.mainLayerId) {
                this.selectedArea = 1;
            }

            if (IfType.list[c].layerId === this.chatLayerId) {
                this.selectedArea = 3;
            }
        }

        if (action === MenuAction.IF_BUTTON) {
            const com: IfType = IfType.list[c];
            let notify: boolean = true;

            if (com.clientCode > 0) {
                notify = this.handleInterfaceAction(com);
            }

            if (notify) {
                this.out.pIsaac(ClientProt.IF_BUTTON);
                this.out.p2(c);
            }
        }

        if (action === MenuAction.IF_BUTTON_TOGGLE) {
            this.out.pIsaac(ClientProt.IF_BUTTON);
            this.out.p2(c);

            const com: IfType = IfType.list[c];
            if (com.scripts && com.scripts[0] && com.scripts[0][0] === 5) {
                const varp: number = com.scripts[0][1];
                this.var[varp] = 1 - this.var[varp];
                this.updateVarp(varp);
                this.redrawSidebar = true;
            }
        }

        if (action === MenuAction.IF_BUTTON_SELECT) {
            this.out.pIsaac(ClientProt.IF_BUTTON);
            this.out.p2(c);

            const com: IfType = IfType.list[c];
            if (com.scripts && com.scripts[0] && com.scripts[0][0] === 5) {
                const varp: number = com.scripts[0][1];
                if (com.scriptOperand && this.var[varp] !== com.scriptOperand[0]) {
                    this.var[varp] = com.scriptOperand[0];
                    this.updateVarp(varp);
                    this.redrawSidebar = true;
                }
            }
        }

        if (action === MenuAction.RESUME_PAUSEBUTTON) {
            if (!this.pressedContinueOption) {
                this.out.pIsaac(ClientProt.RESUME_PAUSEBUTTON);
                this.out.p2(c);
                this.pressedContinueOption = true;
            }
        }

        if (action === MenuAction.CLOSE_MODAL) {
            this.closeModal();
        }

        if (action === MenuAction.REPORT_ABUSE) {
            const option: string = this.menuOption[optionId];
            const tag: number = option.indexOf('@whi@');

            if (tag !== -1) {
                this.closeModal();

                this.reportAbuseInput = option.substring(tag + 5).trim();
                this.reportAbuseMuteOption = false;

                for (let i: number = 0; i < IfType.list.length; i++) {
                    if (IfType.list[i] && IfType.list[i].clientCode === ClientCode.CC_REPORT_INPUT) {
                        this.reportAbuseLayerId = this.mainLayerId = IfType.list[i].layerId;
                        break;
                    }
                }
            }
        }

        if (action === MenuAction.WALK) {
            if (this.menuVisible) {
                this.world?.updateMousePicking(b - 4, c - 4);
            } else {
                this.world?.updateMousePicking(this.mouseClickX - 4, this.mouseClickY - 4);
            }
        }

        if (action === MenuAction.FRIENDLIST_ADD || action === MenuAction.IGNORELIST_ADD || action === MenuAction.FRIENDLIST_DEL || action === MenuAction.IGNORELIST_DEL) {
            const option: string = this.menuOption[optionId];
            const tag: number = option.indexOf('@whi@');

            if (tag !== -1) {
                const username: bigint = JString.toBase37(option.substring(tag + 5).trim());
                if (action === MenuAction.FRIENDLIST_ADD) {
                    this.addFriend(username);
                } else if (action === MenuAction.IGNORELIST_ADD) {
                    this.addIgnore(username);
                } else if (action === MenuAction.FRIENDLIST_DEL) {
                    this.delFriend(username);
                } else if (action === MenuAction.IGNORELIST_DEL) {
                    this.delIgnore(username);
                }
            }
        }

        if (action === MenuAction.MESSAGE_PRIVATE) {
            const option: string = this.menuOption[optionId];
            const tag: number = option.indexOf('@whi@');

            if (tag !== -1) {
                const name37: bigint = JString.toBase37(option.substring(tag + 5).trim());
                let friend: number = -1;

                for (let i: number = 0; i < this.friendCount; i++) {
                    if (this.friendName37[i] === name37) {
                        friend = i;
                        break;
                    }
                }

                if (friend !== -1 && this.friendWorld[friend] > 0) {
                    this.redrawChatback = true;
                    this.chatbackInputOpen = false;
                    this.showSocialInput = true;
                    this.socialInput = '';
                    this.socialInputType = 3;
                    this.socialName37 = this.friendName37[friend];
                    this.socialMessage = 'Enter message to send to ' + this.friendName[friend];
                }
            }
        }

        this.objSelected = 0;
        this.spellSelected = 0;
        this.redrawSidebar = true;
    }

    private addNpcOptions(npc: NpcType, a: number, b: number, c: number): void {
        if (this.menuSize >= 400) {
            return;
        }

        let tooltip: string | null = npc.name;
        if (npc.vislevel !== 0 && this.localPlayer) {
            tooltip = tooltip + this.getCombatLevelTag(this.localPlayer.combatLevel, npc.vislevel) + ' (level-' + npc.vislevel + ')';
        }

        if (this.objSelected === 1) {
            this.menuOption[this.menuSize] = 'Use ' + this.objSelectedName + ' with @yel@' + tooltip;
            this.menuAction[this.menuSize] = MenuAction.OPNPCU;
            this.menuParamA[this.menuSize] = a;
            this.menuParamB[this.menuSize] = b;
            this.menuParamC[this.menuSize] = c;
            this.menuSize++;
        } else if (this.spellSelected !== 1) {
            let type: number;
            if (npc.op) {
                for (type = 4; type >= 0; type--) {
                    if (npc.op[type] && npc.op[type]?.toLowerCase() !== 'attack') {
                        this.menuOption[this.menuSize] = npc.op[type] + ' @yel@' + tooltip;

                        if (type === 0) {
                            this.menuAction[this.menuSize] = MenuAction.OPNPC1;
                        } else if (type === 1) {
                            this.menuAction[this.menuSize] = MenuAction.OPNPC2;
                        } else if (type === 2) {
                            this.menuAction[this.menuSize] = MenuAction.OPNPC3;
                        } else if (type === 3) {
                            this.menuAction[this.menuSize] = MenuAction.OPNPC4;
                        } else if (type === 4) {
                            this.menuAction[this.menuSize] = MenuAction.OPNPC5;
                        }

                        this.menuParamA[this.menuSize] = a;
                        this.menuParamB[this.menuSize] = b;
                        this.menuParamC[this.menuSize] = c;
                        this.menuSize++;
                    }
                }
            }

            if (npc.op) {
                for (type = 4; type >= 0; type--) {
                    if (npc.op[type] && npc.op[type]?.toLowerCase() === 'attack') {
                        let priority: number = 0;
                        if (this.localPlayer && npc.vislevel > this.localPlayer.combatLevel) {
                            priority = MenuAction._PRIORITY;
                        }

                        this.menuOption[this.menuSize] = npc.op[type] + ' @yel@' + tooltip;

                        if (type === 0) {
                            this.menuAction[this.menuSize] = priority + MenuAction.OPNPC1;
                        } else if (type === 1) {
                            this.menuAction[this.menuSize] = priority + MenuAction.OPNPC2;
                        } else if (type === 2) {
                            this.menuAction[this.menuSize] = priority + MenuAction.OPNPC3;
                        } else if (type === 3) {
                            this.menuAction[this.menuSize] = priority + MenuAction.OPNPC4;
                        } else if (type === 4) {
                            this.menuAction[this.menuSize] = priority + MenuAction.OPNPC5;
                        }

                        this.menuParamA[this.menuSize] = a;
                        this.menuParamB[this.menuSize] = b;
                        this.menuParamC[this.menuSize] = c;
                        this.menuSize++;
                    }
                }
            }

            this.menuOption[this.menuSize] = 'Examine @yel@' + tooltip;
            this.menuAction[this.menuSize] = MenuAction.OPNPC6;
            this.menuParamA[this.menuSize] = a;
            this.menuParamB[this.menuSize] = b;
            this.menuParamC[this.menuSize] = c;
            this.menuSize++;
        } else if ((this.activeSpellFlags & 0x2) === 2) {
            this.menuOption[this.menuSize] = this.spellCaption + ' @yel@' + tooltip;
            this.menuAction[this.menuSize] = MenuAction.OPNPCT;
            this.menuParamA[this.menuSize] = a;
            this.menuParamB[this.menuSize] = b;
            this.menuParamC[this.menuSize] = c;
            this.menuSize++;
        }
    }

    private addPlayerOptions(player: ClientPlayer, a: number, b: number, c: number): void {
        if (player === this.localPlayer || this.menuSize >= 400) {
            return;
        }

        let tooltip: string | null = null;
        if (this.localPlayer) {
            tooltip = player.name + this.getCombatLevelTag(this.localPlayer.combatLevel, player.combatLevel) + ' (level-' + player.combatLevel + ')';
        }

        if (this.objSelected === 1) {
            this.menuOption[this.menuSize] = 'Use ' + this.objSelectedName + ' with @whi@' + tooltip;
            this.menuAction[this.menuSize] = MenuAction.OPPLAYERU;
            this.menuParamA[this.menuSize] = a;
            this.menuParamB[this.menuSize] = b;
            this.menuParamC[this.menuSize] = c;
            this.menuSize++;
        } else if (this.spellSelected === 1) {
            if ((this.activeSpellFlags & 0x8) === 8) {
                this.menuOption[this.menuSize] = this.spellCaption + ' @whi@' + tooltip;
                this.menuAction[this.menuSize] = MenuAction.OPPLAYERT;
                this.menuParamA[this.menuSize] = a;
                this.menuParamB[this.menuSize] = b;
                this.menuParamC[this.menuSize] = c;
                this.menuSize++;
            }
        } else {
            for (let i = 4; i >= 0; i--) {
                const op = this.playerOp[i];
                if (op === null || !this.localPlayer) {
                    continue;
                }

                this.menuOption[this.menuSize] = op + ' @whi@' + tooltip;

                let priority = 0;
                if (op.toLowerCase() === 'attack') {
                    if (player.combatLevel > this.localPlayer.combatLevel) {
                        priority = 2000;
                    }
                } else if (this.playerOpPriority[i]) {
                    priority = 2000;
                }

                if (i === 0) {
                    this.menuAction[this.menuSize] = priority + MenuAction.OPPLAYER1;
                } else if (i === 1) {
                    this.menuAction[this.menuSize] = priority + MenuAction.OPPLAYER2;
                } else if (i === 2) {
                    this.menuAction[this.menuSize] = priority + MenuAction.OPPLAYER3;
                } else if (i === 3) {
                    this.menuAction[this.menuSize] = priority + MenuAction.OPPLAYER4;
                } else if (i === 4) {
                    this.menuAction[this.menuSize] = priority + MenuAction.OPPLAYER5;
                }

                this.menuParamA[this.menuSize] = a;
                this.menuParamB[this.menuSize] = b;
                this.menuParamC[this.menuSize] = c;
                this.menuSize++;
            }
        }

        for (let i: number = 0; i < this.menuSize; i++) {
            if (this.menuAction[i] === MenuAction.WALK) {
                this.menuOption[i] = 'Walk here @whi@' + tooltip;
                break;
            }
        }
    }

    private getCombatLevelTag(viewerLevel: number, otherLevel: number): string {
        const diff: number = viewerLevel - otherLevel;
        if (diff < -9) {
            return '@red@';
        } else if (diff < -6) {
            return '@or3@';
        } else if (diff < -3) {
            return '@or2@';
        } else if (diff < 0) {
            return '@or1@';
        } else if (diff > 9) {
            return '@gre@';
        } else if (diff > 6) {
            return '@gr3@';
        } else if (diff > 3) {
            return '@gr2@';
        } else if (diff > 0) {
            return '@gr1@';
        } else {
            return '@yel@';
        }
    }

    private drawLayer(com: IfType, x: number, y: number, scrollY: number): void {
        if (com.type !== 0 || !com.children || (com.hidden && this.overMainLayerId !== com.id && this.overSideLayerId !== com.id && this.overChatLayerId !== com.id)) {
            return;
        }

        const left: number = Pix2D.boundLeft;
        const top: number = Pix2D.boundTop;
        const right: number = Pix2D.boundRight;
        const bottom: number = Pix2D.boundBottom;

        Pix2D.setClipping(x, y, x + com.width, y + com.height);
        const children: number = com.children.length;

        for (let i: number = 0; i < children; i++) {
            if (!com.childX || !com.childY) {
                continue;
            }

            let childX: number = com.childX[i] + x;
            let childY: number = com.childY[i] + y - scrollY;

            const child: IfType = IfType.list[com.children[i]];
            childX += child.x;
            childY += child.y;

            if (child.clientCode > 0) {
                this.updateInterfaceContent(child);
            }

            if (child.type === ComponentType.TYPE_LAYER) {
                if (child.scrollPos > child.scrollSize - child.height) {
                    child.scrollPos = child.scrollSize - child.height;
                }

                if (child.scrollPos < 0) {
                    child.scrollPos = 0;
                }

                this.drawLayer(child, childX, childY, child.scrollPos);

                if (child.scrollSize > child.height) {
                    this.drawScrollbar(childX + child.width, childY, child.scrollPos, child.scrollSize, child.height);
                }
            } else if (child.type === ComponentType.TYPE_INV) {
                let slot: number = 0;

                for (let row: number = 0; row < child.height; row++) {
                    for (let col: number = 0; col < child.width; col++) {
                        if (!child.invSlotOffsetX || !child.invSlotOffsetY || !child.linkObjType || !child.linkObjCount) {
                            continue;
                        }

                        let slotX: number = childX + col * (child.marginX + 32);
                        let slotY: number = childY + row * (child.marginY + 32);

                        if (slot < 20) {
                            slotX += child.invSlotOffsetX[slot];
                            slotY += child.invSlotOffsetY[slot];
                        }

                        if (child.linkObjType[slot] > 0) {
                            let dx: number = 0;
                            let dy: number = 0;
                            const id: number = child.linkObjType[slot] - 1;

                            if ((slotX > Pix2D.boundLeft - 32 && slotX < Pix2D.boundRight && slotY > Pix2D.boundTop - 32 && slotY < Pix2D.boundBottom) || (this.objDragArea !== 0 && this.objDragSlot === slot)) {
                                let outline = 0;
                                if (this.objSelected == 1 && this.objSelectedSlot == slot && this.objSelectedLayerId == child.id) {
                                    outline = 16777215;
                                }

                                const icon: Pix32 | null = ObjType.getSprite(id, child.linkObjCount[slot], outline);
                                if (icon) {
                                    if (this.objDragArea !== 0 && this.objDragSlot === slot && this.objDragLayerId === child.id) {
                                        dx = this.mouseX - this.objGrabX;
                                        dy = this.mouseY - this.objGrabY;

                                        if (dx < 5 && dx > -5) {
                                            dx = 0;
                                        }

                                        if (dy < 5 && dy > -5) {
                                            dy = 0;
                                        }

                                        if (this.objDragCycles < 5) {
                                            dx = 0;
                                            dy = 0;
                                        }

                                        icon.transPlotSprite(128, slotX + dx, slotY + dy);

                                        if (slotY + dy < Pix2D.boundTop && com.scrollPos > 0) {
                                            let autoscroll = (Pix2D.boundTop - slotY - dy) * this.sceneDelta / 3;
                                            if (autoscroll > this.sceneDelta * 10) {
                                                autoscroll = this.sceneDelta * 10;
                                            }

                                            if (autoscroll > com.scrollPos) {
                                                autoscroll = com.scrollPos;
                                            }

                                            com.scrollPos -= autoscroll;
                                            this.objGrabY += autoscroll;
                                        }

                                        if (slotY + dy + 32 > Pix2D.boundBottom && com.scrollPos < com.scrollSize - com.height) {
                                            let autoscroll = (slotY + dy + 32 - Pix2D.boundBottom) * this.sceneDelta / 3;
                                            if (autoscroll > this.sceneDelta * 10) {
                                                autoscroll = this.sceneDelta * 10;
                                            }

                                            if (autoscroll > com.scrollSize - com.height - com.scrollPos) {
                                                autoscroll = com.scrollSize - com.height - com.scrollPos;
                                            }

                                            com.scrollPos += autoscroll;
                                            this.objGrabY -= autoscroll;
                                        }
                                    } else if (this.selectedArea !== 0 && this.selectedItem === slot && this.selectedLayerId === child.id) {
                                        icon.transPlotSprite(128, slotX, slotY);
                                    } else {
                                        icon.plotSprite(slotX, slotY);
                                    }

                                    if (icon.owi === 33 || child.linkObjCount[slot] !== 1) {
                                        const count: number = child.linkObjCount[slot];
                                        this.fontPlain11?.drawString(slotX + dx + 1, slotY + 10 + dy, this.formatObjCount(count), Colors.BLACK);
                                        this.fontPlain11?.drawString(slotX + dx, slotY + 9 + dy, this.formatObjCount(count), Colors.YELLOW);
                                    }
                                }
                            }
                        } else if (child.invSlotGraphic && slot < 20) {
                            const image: Pix32 | null = child.invSlotGraphic[slot];
                            image?.plotSprite(slotX, slotY);
                        }

                        slot++;
                    }
                }
            } else if (child.type === ComponentType.TYPE_RECT) {
                let hovered: boolean = false;
                if (this.overChatLayerId === child.id || this.overSideLayerId === child.id || this.overMainLayerId === child.id) {
                    hovered = true;
                }

                let colour: number = 0;
                if (this.getIfActive(child)) {
                    colour = child.colour2;

                    if (hovered && child.colour2Over !== 0) {
                        colour = child.colour2Over;
                    }
                } else {
                    colour = child.colour;

                    if (hovered && child.colourOver !== 0) {
                        colour = child.colourOver;
                    }
                }

                if (child.transparency === 0) {
                    if (child.fill) {
                        Pix2D.fillRect(childX, childY, child.width, child.height, colour);
                    } else {
                        Pix2D.drawRect(childX, childY, child.width, child.height, colour);
                    }
                } else if (child.fill) {
                    Pix2D.fillRectTrans(childX, childY, child.width, child.height, colour, 256 - (child.transparency & 0xFF));
                } else {
                    Pix2D.drawRect(childX, childY, child.width, child.height, colour);
                    Pix2D.drawRectTrans(childX, childY, child.width, child.height, colour, 256 - (child.transparency & 0xFF));
                }
            } else if (child.type === ComponentType.TYPE_TEXT) {
                const font: PixFont | null = child.font;
                let text: string | null = child.text;

                let hovered: boolean = false;
                if (this.overChatLayerId === child.id || this.overSideLayerId === child.id || this.overMainLayerId === child.id) {
                    hovered = true;
                }

                let colour: number = 0;
                if (this.getIfActive(child)) {
                    colour = child.colour2;

                    if (hovered && child.colour2Over !== 0) {
                        colour = child.colour2Over;
                    }

                    if (child.text2 && child.text2.length > 0) {
                        text = child.text2;
                    }
                } else {
                    colour = child.colour;

                    if (hovered && child.colourOver !== 0) {
                        colour = child.colourOver;
                    }
                }

                if (child.buttonType === ButtonType.BUTTON_CONTINUE && this.pressedContinueOption) {
                    text = 'Please wait...';
                    colour = child.colour;
                }

                if (Pix2D.width == 479) {
                    if (colour == 0xffff00) {
                        colour = 0x0000ff;
                    }

                    if (colour == 0x00c000) {
                        colour = 0xffffff;
                    }
                }

                if (!font || !text) {
                    continue;
                }

                for (let lineY: number = childY + font.height2d; text.length > 0; lineY += font.height2d) {
                    if (text.indexOf('%') !== -1) {
                        do {
                            const index: number = text.indexOf('%1');
                            if (index === -1) {
                                break;
                            }

                            text = text.substring(0, index) + this.getIntString(this.getIfVar(child, 0)) + text.substring(index + 2);
                            // eslint-disable-next-line no-constant-condition
                        } while (true);

                        do {
                            const index: number = text.indexOf('%2');
                            if (index === -1) {
                                break;
                            }

                            text = text.substring(0, index) + this.getIntString(this.getIfVar(child, 1)) + text.substring(index + 2);
                            // eslint-disable-next-line no-constant-condition
                        } while (true);

                        do {
                            const index: number = text.indexOf('%3');
                            if (index === -1) {
                                break;
                            }

                            text = text.substring(0, index) + this.getIntString(this.getIfVar(child, 2)) + text.substring(index + 2);
                            // eslint-disable-next-line no-constant-condition
                        } while (true);

                        do {
                            const index: number = text.indexOf('%4');
                            if (index === -1) {
                                break;
                            }

                            text = text.substring(0, index) + this.getIntString(this.getIfVar(child, 3)) + text.substring(index + 2);
                            // eslint-disable-next-line no-constant-condition
                        } while (true);

                        do {
                            const index: number = text.indexOf('%5');
                            if (index === -1) {
                                break;
                            }

                            text = text.substring(0, index) + this.getIntString(this.getIfVar(child, 4)) + text.substring(index + 2);
                            // eslint-disable-next-line no-constant-condition
                        } while (true);
                    }

                    const newline: number = text.indexOf('\\n');
                    let split: string;
                    if (newline !== -1) {
                        split = text.substring(0, newline);
                        text = text.substring(newline + 2);
                    } else {
                        split = text;
                        text = '';
                    }

                    if (child.center) {
                        font.centreStringTag(childX + ((child.width / 2) | 0), lineY, split, colour, child.shadowed);
                    } else {
                        font.drawStringTag(childX, lineY, split, colour, child.shadowed);
                    }
                }
            } else if (child.type === ComponentType.TYPE_GRAPHIC) {
                let image: Pix32 | null;
                if (this.getIfActive(child)) {
                    image = child.graphic2;
                } else {
                    image = child.graphic;
                }

                image?.plotSprite(childX, childY);
            } else if (child.type === ComponentType.TYPE_MODEL) {
                const tmpX: number = Pix3D.projectionX;
                const tmpY: number = Pix3D.projectionY;

                Pix3D.projectionX = childX + ((child.width / 2) | 0);
                Pix3D.projectionY = childY + ((child.height / 2) | 0);

                const eyeY: number = (Pix3D.sinTable[child.modelXAn] * child.modelZoom) >> 16;
                const eyeZ: number = (Pix3D.cosTable[child.modelXAn] * child.modelZoom) >> 16;

                const active: boolean = this.getIfActive(child);

                let seqId: number;
                if (active) {
                    seqId = child.model2Anim;
                } else {
                    seqId = child.modelAnim;
                }

                let model: Model | null = null;
                if (seqId === -1) {
                    model = child.getTempModel(-1, -1, active, this.localPlayer);
                } else {
                    const seq: SeqType = SeqType.list[seqId];
                    if (seq.frames && seq.iframes) {
                        model = child.getTempModel(seq.frames[child.seqFrame], seq.iframes[child.seqFrame], active, this.localPlayer);
                    }
                }

                if (model) {
                    model.objRender(0, child.modelYAn, 0, child.modelXAn, 0, eyeY, eyeZ);
                }

                Pix3D.projectionX = tmpX;
                Pix3D.projectionY = tmpY;
            } else if (child.type === ComponentType.TYPE_INV_TEXT) {
                const font: PixFont | null = child.font;
                if (!font || !child.linkObjType || !child.linkObjCount) {
                    continue;
                }

                let slot: number = 0;
                for (let row: number = 0; row < child.height; row++) {
                    for (let col: number = 0; col < child.width; col++) {
                        if (child.linkObjType[slot] > 0) {
                            const obj: ObjType = ObjType.get(child.linkObjType[slot] - 1);
                            let text: string | null = obj.name;
                            if (obj.stackable || child.linkObjCount[slot] !== 1) {
                                text = text + ' x' + this.formatObjCountTagged(child.linkObjCount[slot]);
                            }

                            if (!text) {
                                continue;
                            }

                            const textX: number = childX + col * (child.marginX + 115);
                            const textY: number = childY + row * (child.marginY + 12);

                            if (child.center) {
                                font.centreStringTag(textX + ((child.width / 2) | 0), textY, text, child.colour, child.shadowed);
                            } else {
                                font.drawStringTag(textX, textY, text, child.colour, child.shadowed);
                            }
                        }

                        slot++;
                    }
                }
            }
        }

        Pix2D.setClipping(left, top, right, bottom);
    }

    // jag::oldscape::Client::DrawScrollbar
    private drawScrollbar(x: number, y: number, scrollY: number, scrollHeight: number, height: number): void {
        this.scrollbar1?.plotSprite(x, y);
        this.scrollbar2?.plotSprite(x, y + height - 16);
        Pix2D.fillRect(x, y + 16, 16, height - 32, Colors.SCROLLBAR_TRACK);

        let gripSize: number = (((height - 32) * height) / scrollHeight) | 0;
        if (gripSize < 8) {
            gripSize = 8;
        }

        const gripY: number = (((height - gripSize - 32) * scrollY) / (scrollHeight - height)) | 0;
        Pix2D.fillRect(x, y + gripY + 16, 16, gripSize, Colors.SCROLLBAR_GRIP_FOREGROUND);

        Pix2D.vline(x, y + gripY + 16, Colors.SCROLLBAR_GRIP_HIGHLIGHT, gripSize);
        Pix2D.vline(x + 1, y + gripY + 16, Colors.SCROLLBAR_GRIP_HIGHLIGHT, gripSize);

        Pix2D.hline(x, y + gripY + 16, Colors.SCROLLBAR_GRIP_HIGHLIGHT, 16);
        Pix2D.hline(x, y + gripY + 17, Colors.SCROLLBAR_GRIP_HIGHLIGHT, 16);

        Pix2D.vline(x + 15, y + gripY + 16, Colors.SCROLLBAR_GRIP_LOWLIGHT, gripSize);
        Pix2D.vline(x + 14, y + gripY + 17, Colors.SCROLLBAR_GRIP_LOWLIGHT, gripSize - 1);

        Pix2D.hline(x, y + gripY + gripSize + 15, Colors.SCROLLBAR_GRIP_LOWLIGHT, 16);
        Pix2D.hline(x + 1, y + gripY + gripSize + 14, Colors.SCROLLBAR_GRIP_LOWLIGHT, 15);
    }

    private formatObjCount(amount: number): string {
        if (amount < 100000) {
            return String(amount);
        } else if (amount < 10000000) {
            return ((amount / 1000) | 0) + 'K';
        } else {
            return ((amount / 1000000) | 0) + 'M';
        }
    }

    private formatObjCountTagged(amount: number): string {
        let s: string = String(amount);
        for (let i: number = s.length - 3; i > 0; i -= 3) {
            s = s.substring(0, i) + ',' + s.substring(i);
        }
        if (s.length > 8) {
            s = '@gre@' + s.substring(0, s.length - 8) + ' million @whi@(' + s + ')';
        } else if (s.length > 4) {
            s = '@cya@' + s.substring(0, s.length - 4) + 'K @whi@(' + s + ')';
        }
        return ' ' + s;
    }

    // jag::oldscape::Client::DoScrollbar
    private doScrollbar(mouseX: number, mouseY: number, scrollableHeight: number, height: number, redraw: boolean, left: number, top: number, component: IfType): void {
        if (this.scrollGrabbed) {
            this.scrollInputPadding = 32;
        } else {
            this.scrollInputPadding = 0;
        }

        this.scrollGrabbed = false;

        if (mouseX >= left && mouseX < left + 16 && mouseY >= top && mouseY < top + 16) {
            component.scrollPos -= this.dragCycles * 4;

            if (redraw) {
                this.redrawSidebar = true;
            }
        } else if (mouseX >= left && mouseX < left + 16 && mouseY >= top + height - 16 && mouseY < top + height) {
            component.scrollPos += this.dragCycles * 4;

            if (redraw) {
                this.redrawSidebar = true;
            }
        } else if (mouseX >= left - this.scrollInputPadding && mouseX < left + this.scrollInputPadding + 16 && mouseY >= top + 16 && mouseY < top + height - 16 && this.dragCycles > 0) {
            let gripSize: number = (((height - 32) * height) / scrollableHeight) | 0;
            if (gripSize < 8) {
                gripSize = 8;
            }

            const gripY: number = mouseY - top - ((gripSize / 2) | 0) - 16;
            const maxY: number = height - gripSize - 32;

            component.scrollPos = (((scrollableHeight - height) * gripY) / maxY) | 0;

            if (redraw) {
                this.redrawSidebar = true;
            }

            this.scrollGrabbed = true;
        }
    }

    private getIntString(value: number): string {
        return value < 999999999 ? String(value) : '*';
    }

    // jag::oldscape::Client::GetIfActive
    private getIfActive(com: IfType): boolean {
        if (!com.scriptComparator) {
            return false;
        }

        for (let i: number = 0; i < com.scriptComparator.length; i++) {
            if (!com.scriptOperand) {
                return false;
            }

            const value: number = this.getIfVar(com, i);
            const operand: number = com.scriptOperand[i];

            if (com.scriptComparator[i] === 2) {
                if (value >= operand) {
                    return false;
                }
            } else if (com.scriptComparator[i] === 3) {
                if (value <= operand) {
                    return false;
                }
            } else if (com.scriptComparator[i] === 4) {
                if (value === operand) {
                    return false;
                }
            } else if (value !== operand) {
                return false;
            }
        }

        return true;
    }

    // jag::oldscape::Client::GetIfVar
    private getIfVar(component: IfType, scriptId: number): number {
        if (!component.scripts || scriptId >= component.scripts.length) {
            return -2;
        }

        try {
            const script: Uint16Array | null = component.scripts[scriptId];
            if (!script) {
                return -1;
            }

            let register: number = 0;
            let pc: number = 0;

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const opcode: number = script[pc++];
                if (opcode === 0) {
                    return register;
                }

                if (opcode === 1) {
                    // load_skill_level {skill}
                    register += this.statEffectiveLevel[script[pc++]];
                } else if (opcode === 2) {
                    // load_skill_base_level {skill}
                    register += this.statBaseLevel[script[pc++]];
                } else if (opcode === 3) {
                    // load_skill_exp {skill}
                    register += this.statXP[script[pc++]];
                } else if (opcode === 4) {
                    // load_inv_count {interface id} {obj id}
                    const com: IfType = IfType.list[script[pc++]];
                    const obj: number = script[pc++] + 1;

                    if (com.linkObjType && com.linkObjCount) {
                        for (let i: number = 0; i < com.linkObjType.length; i++) {
                            if (com.linkObjType[i] === obj) {
                                register += com.linkObjCount[i];
                            }
                        }
                    } else {
                        register += 0; // TODO this is custom bcos idk if it can fall 'out of sync' if u dont add to register...
                    }
                } else if (opcode === 5) {
                    // load_var {id}
                    register += this.var[script[pc++]];
                } else if (opcode === 6) {
                    // load_next_level_xp {skill}
                    register += this.levelExperience[this.statBaseLevel[script[pc++]] - 1];
                } else if (opcode === 7) {
                    register += ((this.var[script[pc++]] * 100) / 46875) | 0;
                } else if (opcode === 8) {
                    // load_combat_level
                    register += this.localPlayer?.combatLevel || 0;
                } else if (opcode === 9) {
                    // load_total_level
                    for (let i: number = 0; i < 19; i++) {
                        if (i === 18) {
                            // runecrafting
                            i = 20;
                        }

                        register += this.statBaseLevel[i];
                    }
                } else if (opcode === 10) {
                    // load_inv_contains {interface id} {obj id}
                    const com: IfType = IfType.list[script[pc++]];
                    const obj: number = script[pc++] + 1;

                    if (com.linkObjType) {
                        for (let i: number = 0; i < com.linkObjType.length; i++) {
                            if (com.linkObjType[i] === obj) {
                                register += 999999999;
                                break;
                            }
                        }
                    }
                } else if (opcode === 11) {
                    // load_energy
                    register += this.runenergy;
                } else if (opcode === 12) {
                    // load_weight
                    register += this.runweight;
                } else if (opcode === 13) {
                    // load_bool {varp} {bit: 0..31}
                    const varp: number = this.var[script[pc++]];
                    const lsb: number = script[pc++];

                    register += (varp & (0x1 << lsb)) === 0 ? 0 : 1;
                }
            }
        } catch (e) {
            return -1;
        }
    }

    private handleComponentInput(com: IfType, mouseX: number, mouseY: number, x: number, y: number, scrollPosition: number): void {
        if (com.type !== 0 || !com.children || com.hidden || mouseX < x || mouseY < y || mouseX > x + com.width || mouseY > y + com.height || !com.childX || !com.childY) {
            return;
        }

        const children: number = com.children.length;
        for (let i: number = 0; i < children; i++) {
            let childX: number = com.childX[i] + x;
            let childY: number = com.childY[i] + y - scrollPosition;
            const child: IfType = IfType.list[com.children[i]];

            childX += child.x;
            childY += child.y;

            if ((child.overlayer >= 0 || child.colourOver !== 0) && mouseX >= childX && mouseY >= childY && mouseX < childX + child.width && mouseY < childY + child.height) {
                if (child.overlayer >= 0) {
                    this.lastOverLayerId = child.overlayer;
                } else {
                    this.lastOverLayerId = child.id;
                }
            }

            if (child.type === 0) {
                this.handleComponentInput(child, mouseX, mouseY, childX, childY, child.scrollPos);

                if (child.scrollSize > child.height) {
                    this.doScrollbar(mouseX, mouseY, child.scrollSize, child.height, true, childX + child.width, childY, child);
                }
            } else if (child.type === 2) {
                let slot: number = 0;

                for (let row: number = 0; row < child.height; row++) {
                    for (let col: number = 0; col < child.width; col++) {
                        let slotX: number = childX + col * (child.marginX + 32);
                        let slotY: number = childY + row * (child.marginY + 32);

                        if (slot < 20 && child.invSlotOffsetX && child.invSlotOffsetY) {
                            slotX += child.invSlotOffsetX[slot];
                            slotY += child.invSlotOffsetY[slot];
                        }

                        if (mouseX < slotX || mouseY < slotY || mouseX >= slotX + 32 || mouseY >= slotY + 32) {
                            slot++;
                            continue;
                        }

                        this.hoveredSlot = slot;
                        this.hoveredSlotParentId = child.id;

                        if (!child.linkObjType || child.linkObjType[slot] <= 0) {
                            slot++;
                            continue;
                        }

                        const obj: ObjType = ObjType.get(child.linkObjType[slot] - 1);

                        if (this.objSelected === 1 && child.interactable) {
                            if (child.id !== this.objSelectedLayerId || slot !== this.objSelectedSlot) {
                                this.menuOption[this.menuSize] = 'Use ' + this.objSelectedName + ' with @lre@' + obj.name;
                                this.menuAction[this.menuSize] = MenuAction.OPHELDU;
                                this.menuParamA[this.menuSize] = obj.id;
                                this.menuParamB[this.menuSize] = slot;
                                this.menuParamC[this.menuSize] = child.id;
                                this.menuSize++;
                            }
                        } else if (this.spellSelected === 1 && child.interactable) {
                            if ((this.activeSpellFlags & 0x10) === 16) {
                                this.menuOption[this.menuSize] = this.spellCaption + ' @lre@' + obj.name;
                                this.menuAction[this.menuSize] = MenuAction.OPHELDT;
                                this.menuParamA[this.menuSize] = obj.id;
                                this.menuParamB[this.menuSize] = slot;
                                this.menuParamC[this.menuSize] = child.id;
                                this.menuSize++;
                            }
                        } else {
                            if (child.interactable) {
                                for (let op: number = 4; op >= 3; op--) {
                                    if (obj.iop && obj.iop[op]) {
                                        this.menuOption[this.menuSize] = obj.iop[op] + ' @lre@' + obj.name;

                                        if (op === 3) {
                                            this.menuAction[this.menuSize] = MenuAction.OPHELD4;
                                        } else if (op === 4) {
                                            this.menuAction[this.menuSize] = MenuAction.OPHELD5;
                                        }

                                        this.menuParamA[this.menuSize] = obj.id;
                                        this.menuParamB[this.menuSize] = slot;
                                        this.menuParamC[this.menuSize] = child.id;
                                        this.menuSize++;
                                    } else if (op === 4) {
                                        this.menuOption[this.menuSize] = 'Drop @lre@' + obj.name;
                                        this.menuAction[this.menuSize] = MenuAction.OPHELD5;
                                        this.menuParamA[this.menuSize] = obj.id;
                                        this.menuParamB[this.menuSize] = slot;
                                        this.menuParamC[this.menuSize] = child.id;
                                        this.menuSize++;
                                    }
                                }
                            }

                            if (child.usable) {
                                this.menuOption[this.menuSize] = 'Use @lre@' + obj.name;
                                this.menuAction[this.menuSize] = MenuAction.OPHELDT_START;
                                this.menuParamA[this.menuSize] = obj.id;
                                this.menuParamB[this.menuSize] = slot;
                                this.menuParamC[this.menuSize] = child.id;
                                this.menuSize++;
                            }

                            if (child.interactable && obj.iop) {
                                for (let op: number = 2; op >= 0; op--) {
                                    if (obj.iop[op]) {
                                        this.menuOption[this.menuSize] = obj.iop[op] + ' @lre@' + obj.name;

                                        if (op === 0) {
                                            this.menuAction[this.menuSize] = MenuAction.OPHELD1;
                                        } else if (op === 1) {
                                            this.menuAction[this.menuSize] = MenuAction.OPHELD2;
                                        } else if (op === 2) {
                                            this.menuAction[this.menuSize] = MenuAction.OPHELD3;
                                        }

                                        this.menuParamA[this.menuSize] = obj.id;
                                        this.menuParamB[this.menuSize] = slot;
                                        this.menuParamC[this.menuSize] = child.id;
                                        this.menuSize++;
                                    }
                                }
                            }

                            if (child.iop) {
                                for (let op: number = 4; op >= 0; op--) {
                                    if (child.iop[op]) {
                                        this.menuOption[this.menuSize] = child.iop[op] + ' @lre@' + obj.name;

                                        if (op === 0) {
                                            this.menuAction[this.menuSize] = MenuAction.INV_BUTTON1;
                                        } else if (op === 1) {
                                            this.menuAction[this.menuSize] = MenuAction.INV_BUTTON2;
                                        } else if (op === 2) {
                                            this.menuAction[this.menuSize] = MenuAction.INV_BUTTON3;
                                        } else if (op === 3) {
                                            this.menuAction[this.menuSize] = MenuAction.INV_BUTTON4;
                                        } else if (op === 4) {
                                            this.menuAction[this.menuSize] = MenuAction.INV_BUTTON5;
                                        }

                                        this.menuParamA[this.menuSize] = obj.id;
                                        this.menuParamB[this.menuSize] = slot;
                                        this.menuParamC[this.menuSize] = child.id;
                                        this.menuSize++;
                                    }
                                }
                            }

                            this.menuOption[this.menuSize] = 'Examine @lre@' + obj.name;
                            this.menuAction[this.menuSize] = MenuAction.OPHELD6;
                            this.menuParamA[this.menuSize] = obj.id;
                            if (child.linkObjCount) {
                                this.menuParamC[this.menuSize] = child.linkObjCount[slot];
                            }
                            this.menuSize++;
                        }

                        slot++;
                    }
                }
            } else if (mouseX >= childX && mouseY >= childY && mouseX < childX + child.width && mouseY < childY + child.height) {
                if (child.buttonType === ButtonType.BUTTON_OK) {
                    let override: boolean = false;
                    if (child.clientCode !== 0) {
                        override = this.handleSocialMenuOption(child);
                    }

                    if (!override && child.option) {
                        this.menuOption[this.menuSize] = child.option;
                        this.menuAction[this.menuSize] = MenuAction.IF_BUTTON;
                        this.menuParamC[this.menuSize] = child.id;
                        this.menuSize++;
                    }
                } else if (child.buttonType === ButtonType.BUTTON_TARGET && this.spellSelected === 0) {
                    let prefix: string | null = child.targetVerb;
                    if (prefix && prefix.indexOf(' ') !== -1) {
                        prefix = prefix.substring(0, prefix.indexOf(' '));
                    }

                    this.menuOption[this.menuSize] = prefix + ' @gre@' + child.targetText;
                    this.menuAction[this.menuSize] = MenuAction.OPHELDT_SELECT;
                    this.menuParamC[this.menuSize] = child.id;
                    this.menuSize++;
                } else if (child.buttonType === ButtonType.BUTTON_CLOSE) {
                    this.menuOption[this.menuSize] = 'Close';
                    this.menuAction[this.menuSize] = MenuAction.CLOSE_MODAL;
                    this.menuParamC[this.menuSize] = child.id;
                    this.menuSize++;
                } else if (child.buttonType === ButtonType.BUTTON_TOGGLE && child.option) {
                    this.menuOption[this.menuSize] = child.option;
                    this.menuAction[this.menuSize] = MenuAction.IF_BUTTON_TOGGLE;
                    this.menuParamC[this.menuSize] = child.id;
                    this.menuSize++;
                } else if (child.buttonType === ButtonType.BUTTON_SELECT && child.option) {
                    this.menuOption[this.menuSize] = child.option;
                    this.menuAction[this.menuSize] = MenuAction.IF_BUTTON_SELECT;
                    this.menuParamC[this.menuSize] = child.id;
                    this.menuSize++;
                } else if (child.buttonType === ButtonType.BUTTON_CONTINUE && !this.pressedContinueOption && child.option) {
                    this.menuOption[this.menuSize] = child.option;
                    this.menuAction[this.menuSize] = MenuAction.RESUME_PAUSEBUTTON;
                    this.menuParamC[this.menuSize] = child.id;
                    this.menuSize++;
                }
            }
        }
    }

    private handleSocialMenuOption(component: IfType): boolean {
        let clientCode: number = component.clientCode;

        if ((clientCode >= ClientCode.CC_FRIENDS_START && clientCode <= ClientCode.CC_FRIENDS_UPDATE_END) || (clientCode >= 701 && clientCode <= 900)) {
            if (clientCode >= 801) {
                clientCode -= 701;
            } else if (clientCode >= 701) {
                clientCode -= 601;
            } else if (clientCode >= ClientCode.CC_FRIENDS_UPDATE_START) {
                clientCode -= ClientCode.CC_FRIENDS_UPDATE_START;
            } else {
                clientCode--;
            }

            this.menuOption[this.menuSize] = 'Remove @whi@' + this.friendName[clientCode];
            this.menuAction[this.menuSize] = MenuAction.FRIENDLIST_DEL;
            this.menuSize++;

            this.menuOption[this.menuSize] = 'Message @whi@' + this.friendName[clientCode];
            this.menuAction[this.menuSize] = MenuAction.MESSAGE_PRIVATE;
            this.menuSize++;
            return true;
        } else if (clientCode >= ClientCode.CC_IGNORES_START && clientCode <= ClientCode.CC_IGNORES_END) {
            this.menuOption[this.menuSize] = 'Remove @whi@' + component.text;
            this.menuAction[this.menuSize] = MenuAction.IGNORELIST_DEL;
            this.menuSize++;
            return true;
        }

        return false;
    }

    private resetInterfaceAnimation(id: number): void {
        const parent: IfType = IfType.list[id];
        if (!parent.children) {
            return;
        }

        for (let i: number = 0; i < parent.children.length && parent.children[i] !== -1; i++) {
            const child: IfType = IfType.list[parent.children[i]];

            if (child.type === 1) {
                this.resetInterfaceAnimation(child.id);
            }

            child.seqFrame = 0;
            child.seqCycle = 0;
        }
    }

    // jag::oldscape::Client::AnimateLayer
    private animateLayer(id: number, delta: number): boolean {
        const parent: IfType = IfType.list[id];
        if (!parent.children) {
            return false;
        }

        let updated: boolean = false;

        for (let i: number = 0; i < parent.children.length && parent.children[i] !== -1; i++) {
            const child: IfType = IfType.list[parent.children[i]];
            if (child.type === 1) {
                updated ||= this.animateLayer(child.id, delta);
            }

            if (child.type === 6 && (child.modelAnim !== -1 || child.model2Anim !== -1)) {
                const active: boolean = this.getIfActive(child);

                let seqId: number;
                if (active) {
                    seqId = child.model2Anim;
                } else {
                    seqId = child.modelAnim;
                }

                if (seqId !== -1) {
                    const type: SeqType = SeqType.list[seqId];
                    child.seqCycle += delta;

                    while (child.seqCycle > type.getDuration(child.seqFrame)) {
                        child.seqCycle -= type.getDuration(child.seqFrame) + 1;
                        child.seqFrame++;

                        if (child.seqFrame >= type.numFrames) {
                            child.seqFrame -= type.loops;

                            if (child.seqFrame < 0 || child.seqFrame >= type.numFrames) {
                                child.seqFrame = 0;
                            }
                        }

                        updated = true;
                    }
                }
            }
        }

        return updated;
    }

    private updateVarp(id: number): void {
        const clientcode: number = VarpType.list[id].clientcode;
        if (clientcode === 0) {
            return;
        }

        const value: number = this.var[id];
        if (clientcode === 1) {
            if (value === 1) {
                Pix3D.initColourTable(0.9);
            } else if (value === 2) {
                Pix3D.initColourTable(0.8);
            } else if (value === 3) {
                Pix3D.initColourTable(0.7);
            } else if (value === 4) {
                Pix3D.initColourTable(0.6);
            }

            ObjType.spriteCache?.clear();
            this.redrawFrame = true;
        } else if (clientcode === 3) {
            const lastMidiActive: boolean = this.midiActive;

            if (value === 0) {
                this.midiVolume = 128;
                setMidiVolume(128);
                this.midiActive = true;
            } else if (value === 1) {
                this.midiVolume = 96;
                setMidiVolume(96);
                this.midiActive = true;
            } else if (value === 2) {
                this.midiVolume = 64;
                setMidiVolume(64);
                this.midiActive = true;
            } else if (value === 3) {
                this.midiVolume = 32;
                setMidiVolume(32);
                this.midiActive = true;
            } else if (value === 4) {
                this.midiActive = false;
            }

            if (this.midiActive !== lastMidiActive) {
                if (this.midiActive) {
                    this.midiSong = this.nextMidiSong;
                    this.midiFading = false;
                    this.onDemand?.request(2, this.midiSong);
                } else {
                    stopMidi(false);
                }

                this.nextMusicDelay = 0;
            }
        } else if (clientcode === 4) {
            if (value === 0) {
                this.waveVolume = 128;
                setWaveVolume(128);
                this.waveEnabled = true;
            } else if (value === 1) {
                this.waveVolume = 96;
                setWaveVolume(96);
                this.waveEnabled = true;
            } else if (value === 2) {
                this.waveVolume = 64;
                setWaveVolume(64);
                this.waveEnabled = true;
            } else if (value === 3) {
                this.waveVolume = 32;
                setWaveVolume(32);
                this.waveEnabled = true;
            } else if (value === 4) {
                this.waveEnabled = false;
            }
        } else if (clientcode === 5) {
            this.oneMouseButton = value;
        } else if (clientcode === 6) {
            this.chatEffects = value;
        } else if (clientcode === 8) {
            this.splitPrivateChat = value;
            this.redrawChatback = true;
        } else if (clientcode === 9) {
            this.bankArrangeMode = value;
        }
    }

    private updateInterfaceContent(com: IfType): void {
        let clientCode: number = com.clientCode;

        if ((clientCode >= ClientCode.CC_FRIENDS_START && clientCode <= ClientCode.CC_FRIENDS_END) || (clientCode >= ClientCode.CC_FRIENDS2_START && clientCode <= ClientCode.CC_FRIENDS2_END)) {
            if (clientCode === ClientCode.CC_FRIENDS_START && this.friendListStatus === 0) {
                com.text = 'Loading friend list';
                com.buttonType = 0;
            } else if (clientCode === ClientCode.CC_FRIENDS_START && this.friendListStatus === 1) {
                com.text = 'Connecting to friendserver';
                com.buttonType = 0;
            } else if (clientCode === 2 && this.friendListStatus !== 2) {
                com.text = 'Please wait...';
                com.buttonType = 0;
            } else {
                let count = this.friendCount;
                if (this.friendListStatus != 2) {
                    count = 0;
                }

                if (clientCode > 700) {
                    clientCode -= 601;
                } else {
                    clientCode -= 1;
                }

                if (clientCode >= count) {
                    com.text = '';
                    com.buttonType = 0;
                } else {
                    com.text = this.friendName[clientCode];
                    com.buttonType = 1;
                }
            }
        } else if ((clientCode >= ClientCode.CC_FRIENDS_UPDATE_START && clientCode <= ClientCode.CC_FRIENDS_UPDATE_END) || (clientCode >= ClientCode.CC_FRIENDS2_UPDATE_START && clientCode <= ClientCode.CC_FRIENDS2_UPDATE_END)) {
            let count = this.friendCount;
            if (this.friendListStatus != 2) {
                count = 0;
            }

            if (clientCode > 800) {
                clientCode -= 701;
            } else {
                clientCode -= 101;
            }

            if (clientCode >= count) {
                com.text = '';
                com.buttonType = 0;
            } else {
                if (this.friendWorld[clientCode] === 0) {
                    com.text = '@red@Offline';
                } else if (this.friendWorld[clientCode] === Client.nodeId) {
                    com.text = '@gre@World-' + (this.friendWorld[clientCode] - 9);
                } else {
                    com.text = '@yel@World-' + (this.friendWorld[clientCode] - 9);
                }

                com.buttonType = 1;
            }
        } else if (clientCode === ClientCode.CC_FRIENDS_SIZE) {
            let count = this.friendCount;
            if (this.friendListStatus != 2) {
                count = 0;
            }

            com.scrollSize = count * 15 + 20;

            if (com.scrollSize <= com.height) {
                com.scrollSize = com.height + 1;
            }
        } else if (clientCode >= ClientCode.CC_IGNORES_START && clientCode <= ClientCode.CC_IGNORES_END) {
            clientCode -= ClientCode.CC_IGNORES_START;

            if (clientCode >= this.ignoreCount) {
                com.text = '';
                com.buttonType = 0;
            } else {
                com.text = JString.formatName(JString.fromBase37(this.ignoreName37[clientCode]));
                com.buttonType = 1;
            }
        } else if (clientCode === ClientCode.CC_IGNORES_SIZE) {
            com.scrollSize = this.ignoreCount * 15 + 20;

            if (com.scrollSize <= com.height) {
                com.scrollSize = com.height + 1;
            }
        } else if (clientCode === ClientCode.CC_DESIGN_PREVIEW) {
            com.modelXAn = 150;
            com.modelYAn = ((Math.sin(this.loopCycle / 40.0) * 256.0) | 0) & 0x7ff;

            if (this.updateDesignModel) {
                for (let i = 0; i < 7; i++) {
                    const kit = this.designKits[i];
                    if (kit >= 0 && !IdkType.list[kit].checkModel()) {
                        return;
                    }
                }

                this.updateDesignModel = false;

                const models: (Model | null)[] = new TypedArray1d(7, null);
                let modelCount: number = 0;
                for (let part: number = 0; part < 7; part++) {
                    const kit: number = this.designKits[part];
                    if (kit >= 0) {
                        models[modelCount++] = IdkType.list[kit].getModelNoCheck();
                    }
                }

                const model: Model = Model.combine(models, modelCount);
                for (let part: number = 0; part < 5; part++) {
                    if (this.designColours[part] !== 0) {
                        model.recolour(ClientPlayer.recol1d[part][0], ClientPlayer.recol1d[part][this.designColours[part]]);

                        if (part === 1) {
                            model.recolour(ClientPlayer.recol2d[0], ClientPlayer.recol2d[this.designColours[part]]);
                        }
                    }
                }

                model.prepareAnim();
                model.calculateNormals(64, 850, -30, -50, -30, true);

                if (this.localPlayer) {
                    const frames: Int16Array | null = SeqType.list[this.localPlayer.readyanim].frames;
                    if (frames) {
                        model.animate(frames[0]);
                    }
                }

                com.modelType = 5;
                com.modelId = 0;
                IfType.cacheModel(model, 5, 0);
            }
        } else if (clientCode === ClientCode.CC_SWITCH_TO_MALE) {
            if (!this.genderButton1) {
                this.genderButton1 = com.graphic;
                this.genderButton2 = com.graphic2;
            }

            if (this.designGender) {
                com.graphic = this.genderButton2;
            } else {
                com.graphic = this.genderButton1;
            }
        } else if (clientCode === ClientCode.CC_SWITCH_TO_FEMALE) {
            if (!this.genderButton1) {
                this.genderButton1 = com.graphic;
                this.genderButton2 = com.graphic2;
            }

            if (this.designGender) {
                com.graphic = this.genderButton1;
            } else {
                com.graphic = this.genderButton2;
            }
        } else if (clientCode === ClientCode.CC_REPORT_INPUT) {
            com.text = this.reportAbuseInput;

            if (this.loopCycle % 20 < 10) {
                com.text = com.text + '|';
            } else {
                com.text = com.text + ' ';
            }
        } else if (clientCode === ClientCode.CC_MOD_MUTE) {
            if (this.staffmodlevel < 1) {
                com.text = '';
            } else if (this.reportAbuseMuteOption) {
                com.colour = Colors.RED;
                com.text = 'Moderator option: Mute player for 48 hours: <ON>';
            } else {
                com.colour = Colors.WHITE;
                com.text = 'Moderator option: Mute player for 48 hours: <OFF>';
            }
        } else if (clientCode === ClientCode.CC_LAST_LOGIN_INFO || clientCode === ClientCode.CC_LAST_LOGIN_INFO2) {
            if (this.lastAddress === 0) {
                com.text = '';
            } else {
                let text: string;
                if (this.daysSinceLastLogin === 0) {
                    text = 'earlier today';
                } else if (this.daysSinceLastLogin === 1) {
                    text = 'yesterday';
                } else {
                    text = this.daysSinceLastLogin + ' days ago';
                }

                // Show IP only if not 127.0.0.1 (servers may opt into privacy, making it needless info)
                const ipStr = JString.formatIPv4(this.lastAddress); // would be a DNS lookup if we could...
                com.text = 'You last logged in ' + text + (ipStr === '127.0.0.1' ? '.' : ' from: ' + ipStr);
            }
        } else if (clientCode === ClientCode.CC_UNREAD_MESSAGES) {
            if (this.unreadMessages === 0) {
                com.text = '0 unread messages';
                com.colour = Colors.YELLOW;
            } else if (this.unreadMessages === 1) {
                com.text = '1 unread message';
                com.colour = Colors.GREEN;
            } else if (this.unreadMessages > 1) {
                com.text = this.unreadMessages + ' unread messages';
                com.colour = Colors.GREEN;
            }
        } else if (clientCode === ClientCode.CC_RECOVERY1) {
            if (this.daysSinceRecoveriesChanged === 201) {
                if (this.warnMembersInNonMembers == 1) {
                    com.text = '@yel@This is a non-members world: @whi@Since you are a member we';
                } else {
                    com.text = '';
                }
            } else if (this.daysSinceRecoveriesChanged === 200) {
                com.text = 'You have not yet set any password recovery questions.';
            } else {
                let text: string;
                if (this.daysSinceRecoveriesChanged === 0) {
                    text = 'Earlier today';
                } else if (this.daysSinceRecoveriesChanged === 1) {
                    text = 'Yesterday';
                } else {
                    text = this.daysSinceRecoveriesChanged + ' days ago';
                }

                com.text = text + ' you changed your recovery questions';
            }
        } else if (clientCode === ClientCode.CC_RECOVERY2) {
            if (this.daysSinceRecoveriesChanged === 201) {
                if (this.warnMembersInNonMembers == 1) {
                    com.text = '@whi@recommend you use a members world instead. You may use';
                } else {
                    com.text = '';
                }
            } else if (this.daysSinceRecoveriesChanged === 200) {
                com.text = 'We strongly recommend you do so now to secure your account.';
            } else {
                com.text = 'If you do not remember making this change then cancel it immediately';
            }
        } else if (clientCode === ClientCode.CC_RECOVERY3) {
            if (this.daysSinceRecoveriesChanged === 201) {
                if (this.warnMembersInNonMembers == 1) {
                    com.text = '@whi@this world but member benefits are unavailable whilst here.';
                } else {
                    com.text = '';
                }
            } else if (this.daysSinceRecoveriesChanged === 200) {
                com.text = "Do this from the 'account management' area on our front webpage";
            } else {
                com.text = "Do this from the 'account management' area on our front webpage";
            }
        }
    }

    private handleInterfaceAction(com: IfType): boolean {
        const clientCode: number = com.clientCode;

        if (this.friendListStatus === 2) {
            if (clientCode === ClientCode.CC_ADD_FRIEND) {
                this.redrawChatback = true;
                this.chatbackInputOpen = false;
                this.showSocialInput = true;
                this.socialInput = '';
                this.socialInputType = 1;
                this.socialMessage = 'Enter name of friend to add to list';
            } else if (clientCode === ClientCode.CC_DEL_FRIEND) {
                this.redrawChatback = true;
                this.chatbackInputOpen = false;
                this.showSocialInput = true;
                this.socialInput = '';
                this.socialInputType = 2;
                this.socialMessage = 'Enter name of friend to delete from list';
            }
        }

        if (clientCode === ClientCode.CC_LOGOUT) {
            this.pendingLogout = 250;
            return true;
        } else if (clientCode === ClientCode.CC_ADD_IGNORE) {
            this.redrawChatback = true;
            this.chatbackInputOpen = false;
            this.showSocialInput = true;
            this.socialInput = '';
            this.socialInputType = 4;
            this.socialMessage = 'Enter name of player to add to list';
        } else if (clientCode === ClientCode.CC_DEL_IGNORE) {
            this.redrawChatback = true;
            this.chatbackInputOpen = false;
            this.showSocialInput = true;
            this.socialInput = '';
            this.socialInputType = 5;
            this.socialMessage = 'Enter name of player to delete from list';
        } else if (clientCode >= ClientCode.CC_CHANGE_HEAD_L && clientCode <= ClientCode.CC_CHANGE_FEET_R) {
            const part: number = ((clientCode - 300) / 2) | 0;
            const direction: number = clientCode & 0x1;
            let kit: number = this.designKits[part];

            if (kit !== -1) {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    if (direction === 0) {
                        kit--;
                        if (kit < 0) {
                            kit = IdkType.count - 1;
                        }
                    }

                    if (direction === 1) {
                        kit++;
                        if (kit >= IdkType.count) {
                            kit = 0;
                        }
                    }

                    if (!IdkType.list[kit].disable && IdkType.list[kit].type === part + (this.designGender ? 0 : 7)) {
                        this.designKits[part] = kit;
                        this.updateDesignModel = true;
                        break;
                    }
                }
            }
        } else if (clientCode >= ClientCode.CC_RECOLOUR_HAIR_L && clientCode <= ClientCode.CC_RECOLOUR_SKIN_R) {
            const part: number = ((clientCode - 314) / 2) | 0;
            const direction: number = clientCode & 0x1;
            let color: number = this.designColours[part];

            if (direction === 0) {
                color--;
                if (color < 0) {
                    color = ClientPlayer.recol1d[part].length - 1;
                }
            }

            if (direction === 1) {
                color++;
                if (color >= ClientPlayer.recol1d[part].length) {
                    color = 0;
                }
            }

            this.designColours[part] = color;
            this.updateDesignModel = true;
        } else if (clientCode === ClientCode.CC_SWITCH_TO_MALE && !this.designGender) {
            this.designGender = true;
            this.validateCharacterDesign();
        } else if (clientCode === ClientCode.CC_SWITCH_TO_FEMALE && this.designGender) {
            this.designGender = false;
            this.validateCharacterDesign();
        } else if (clientCode === ClientCode.CC_ACCEPT_DESIGN) {
            this.out.pIsaac(ClientProt.IDK_SAVEDESIGN);
            this.out.p1(this.designGender ? 0 : 1);

            for (let i: number = 0; i < 7; i++) {
                this.out.p1(this.designKits[i]);
            }

            for (let i: number = 0; i < 5; i++) {
                this.out.p1(this.designColours[i]);
            }

            return true;
        } else if (clientCode === ClientCode.CC_MOD_MUTE) {
            this.reportAbuseMuteOption = !this.reportAbuseMuteOption;
        } else if (clientCode >= ClientCode.CC_REPORT_RULE1 && clientCode <= ClientCode.CC_REPORT_RULE12) {
            this.closeModal();

            if (this.reportAbuseInput.length > 0) {
                this.out.pIsaac(ClientProt.REPORT_ABUSE);
                this.out.p8(JString.toBase37(this.reportAbuseInput));
                this.out.p1(clientCode - 601);
                this.out.p1(this.reportAbuseMuteOption ? 1 : 0);
            }
        }

        return false;
    }

    private validateCharacterDesign(): void {
        this.updateDesignModel = true;

        for (let i: number = 0; i < 7; i++) {
            this.designKits[i] = -1;

            for (let j: number = 0; j < IdkType.count; j++) {
                if (!IdkType.list[j].disable && IdkType.list[j].type === i + (this.designGender ? 0 : 7)) {
                    this.designKits[i] = j;
                    break;
                }
            }
        }
    }

    private drawSidebar(): void {
        this.areaSidebar?.bind();
        if (this.sidebarScanline) {
            Pix3D.scanline = this.sidebarScanline;
        }

        this.invback?.plotSprite(0, 0);

        if (this.sideLayerId !== -1) {
            this.drawLayer(IfType.list[this.sideLayerId], 0, 0, 0);
        } else if (this.sideTabLayerId[this.sideTab] !== -1) {
            this.drawLayer(IfType.list[this.sideTabLayerId[this.sideTab]], 0, 0, 0);
        }

        if (this.menuVisible && this.menuArea === 1) {
            this.drawMenu();
        }

        this.areaSidebar?.draw(553, 205);

        this.areaViewport?.bind();
        if (this.viewportScanline) {
            Pix3D.scanline = this.viewportScanline;
        }
    }

    private drawChat(): void {
        this.areaChatback?.bind();
        if (this.chatbackScanline) {
            Pix3D.scanline = this.chatbackScanline;
        }

        this.chatback?.plotSprite(0, 0);

        if (this.showSocialInput) {
            this.fontBold12?.centreString(239, 40, this.socialMessage, Colors.BLACK);
            this.fontBold12?.centreString(239, 60, this.socialInput + '*', Colors.DARKBLUE);
        } else if (this.chatbackInputOpen) {
            this.fontBold12?.centreString(239, 40, 'Enter amount:', Colors.BLACK);
            this.fontBold12?.centreString(239, 60, this.chatbackInput + '*', Colors.DARKBLUE);
        } else if (this.modalMessage) {
            this.fontBold12?.centreString(239, 40, this.modalMessage, Colors.BLACK);
            this.fontBold12?.centreString(239, 60, 'Click to continue', Colors.DARKBLUE);
        } else if (this.chatLayerId !== -1) {
            this.drawLayer(IfType.list[this.chatLayerId], 0, 0, 0);
        } else if (this.tutLayerId !== -1) {
            this.drawLayer(IfType.list[this.tutLayerId], 0, 0, 0);
        } else {
            let font: PixFont | null = this.fontPlain12;
            let line: number = 0;

            Pix2D.setClipping(0, 0, 463, 77);

            for (let i: number = 0; i < 100; i++) {
                const message: string | null = this.messageText[i];
                if (!message) {
                    continue;
                }

                const type: number = this.messageType[i];
                const y: number = this.chatScrollOffset + 70 - line * 14;

                let sender = this.messageSender[i];
                let modlevel = 0;
                if (sender && sender.startsWith('@cr1@')) {
                    sender = sender.substring(5);
                    modlevel = 1;
                } else if (sender && sender.startsWith('@cr2@')) {
                    sender = sender.substring(5);
                    modlevel = 2;
                }

                if (type === 0) {
                    if (y > 0 && y < 110) {
                        font?.drawString(4, y, message, Colors.BLACK);
                    }

                    line++;
                } else if ((type === 1 || type === 2) && (type === 1 || this.chatPublicMode === 0 || (this.chatPublicMode === 1 && this.isFriend(sender)))) {
                    if (y > 0 && y < 110) {
                        let x = 4;
                        if (modlevel == 1) {
                            this.modIcons[0].plotSprite(x, y - 12);
                            x += 14;
                        } else if (modlevel == 2) {
                            this.modIcons[1].plotSprite(x, y - 12);
                            x += 14;
                        }

                        font?.drawString(x, y, sender + ':', Colors.BLACK);
                        x += (font?.stringWid(sender) ?? 0) + 8;

                        font?.drawString(x, y, message, Colors.BLUE);
                    }

                    line++;
                } else if ((type === 3 || type === 7) && this.splitPrivateChat === 0 && (type === 7 || this.chatPrivateMode === 0 || (this.chatPrivateMode === 1 && this.isFriend(sender)))) {
                    if (y > 0 && y < 110) {
                        let x = 4;

                        font?.drawString(x, y, 'From ', Colors.BLACK);
                        x += font?.stringWid('From ') ?? 0;

                        if (modlevel == 1) {
                            this.modIcons[0].plotSprite(x, y - 12);
                            x += 14;
                        } else if (modlevel == 2) {
                            this.modIcons[1].plotSprite(x, y - 12);
                            x += 14;
                        }

                        font?.drawString(x, y, sender + ':', Colors.BLACK);
                        x += (font?.stringWid(sender) ?? 0) + 8;

                        font?.drawString(x, y, message, Colors.DARKRED);
                    }

                    line++;
                } else if (type === 4 && (this.chatTradeMode === 0 || (this.chatTradeMode === 1 && this.isFriend(sender)))) {
                    if (y > 0 && y < 110) {
                        font?.drawString(4, y, sender + ' ' + this.messageText[i], Colors.TRADE_MESSAGE);
                    }

                    line++;
                } else if (type === 5 && this.splitPrivateChat === 0 && this.chatPrivateMode < 2) {
                    if (y > 0 && y < 110) {
                        font?.drawString(4, y, message, Colors.DARKRED);
                    }

                    line++;
                } else if (type === 6 && this.splitPrivateChat === 0 && this.chatPrivateMode < 2) {
                    if (y > 0 && y < 110) {
                        font?.drawString(4, y, 'To ' + sender + ':', Colors.BLACK);
                        font?.drawString(font.stringWid('To ' + sender) + 12, y, message, Colors.DARKRED);
                    }

                    line++;
                } else if (type === 8 && (this.chatTradeMode === 0 || (this.chatTradeMode === 1 && this.isFriend(sender)))) {
                    if (y > 0 && y < 110) {
                        font?.drawString(4, y, sender + ' ' + this.messageText[i], Colors.DUEL_MESSAGE);
                    }

                    line++;
                }
            }

            Pix2D.resetClipping();

            this.chatScrollHeight = line * 14 + 7;
            if (this.chatScrollHeight < 78) {
                this.chatScrollHeight = 78;
            }

            this.drawScrollbar(463, 0, this.chatScrollHeight - this.chatScrollOffset - 77, this.chatScrollHeight, 77);

            let username;
            if (this.localPlayer == null || this.localPlayer.name == null) {
                username = JString.formatName(this.loginUser);
            } else {
                username = this.localPlayer.name;
            }

            font?.drawString(4, 90, username + ':', Colors.BLACK);
            font?.drawString(font.stringWid(username + ': ') + 6, 90, this.chatTyped + '*', Colors.BLUE);

            Pix2D.hline(0, 77, Colors.BLACK, 479);
        }

        if (this.menuVisible && this.menuArea === 2) {
            this.drawMenu();
        }

        this.areaChatback?.draw(17, 357);

        this.areaViewport?.bind();
        if (this.viewportScanline) {
            Pix3D.scanline = this.viewportScanline;
        }
    }

    private drawMinimap(): void {
        if (!this.localPlayer) {
            return;
        }

        this.areaMapback?.bind();

        const angle: number = (this.orbitCameraYaw + this.macroMinimapAngle) & 0x7ff;
        let anchorX: number = ((this.localPlayer.x / 32) | 0) + 48;
        let anchorY: number = 464 - ((this.localPlayer.z / 32) | 0);

        this.minimap?.scanlineRotatePlotSprite(25, 5, 146, 151, this.minimapMaskLineOffsets, this.minimapMaskLineLengths, anchorX, anchorY, angle, this.macroMinimapZoom + 256);
        this.compass?.scanlineRotatePlotSprite(0, 0, 33, 33, this.compassMaskLineOffsets, this.compassMaskLineLengths, 25, 25, this.orbitCameraYaw, 256);

        for (let i: number = 0; i < this.activeMapFunctionCount; i++) {
            anchorX = this.activeMapFunctionX[i] * 4 + 2 - ((this.localPlayer.x / 32) | 0);
            anchorY = this.activeMapFunctionZ[i] * 4 + 2 - ((this.localPlayer.z / 32) | 0);
            this.drawOnMinimap(anchorY, this.activeMapFunctions[i], anchorX);
        }

        for (let ltx: number = 0; ltx < CollisionConstants.SIZE; ltx++) {
            for (let ltz: number = 0; ltz < CollisionConstants.SIZE; ltz++) {
                const stack: LinkList | null = this.objStacks[this.minusedlevel][ltx][ltz];
                if (stack) {
                    anchorX = ltx * 4 + 2 - ((this.localPlayer.x / 32) | 0);
                    anchorY = ltz * 4 + 2 - ((this.localPlayer.z / 32) | 0);
                    this.drawOnMinimap(anchorY, this.mapdots1, anchorX);
                }
            }
        }

        for (let i: number = 0; i < this.npcCount; i++) {
            const npc: ClientNpc | null = this.npc[this.npcIds[i]];
            if (npc && npc.isReady() && npc.type && npc.type.minimap) {
                anchorX = ((npc.x / 32) | 0) - ((this.localPlayer.x / 32) | 0);
                anchorY = ((npc.z / 32) | 0) - ((this.localPlayer.z / 32) | 0);
                this.drawOnMinimap(anchorY, this.mapdots2, anchorX);
            }
        }

        for (let i: number = 0; i < this.playerCount; i++) {
            const player: ClientPlayer | null = this.players[this.playerIds[i]];
            if (player && player.isReady() && player.name) {
                anchorX = ((player.x / 32) | 0) - ((this.localPlayer.x / 32) | 0);
                anchorY = ((player.z / 32) | 0) - ((this.localPlayer.z / 32) | 0);

                let friend: boolean = false;
                const name37: bigint = JString.toBase37(player.name);
                for (let j: number = 0; j < this.friendCount; j++) {
                    if (name37 === this.friendName37[j] && this.friendWorld[j] !== 0) {
                        friend = true;
                        break;
                    }
                }

                if (friend) {
                    this.drawOnMinimap(anchorY, this.mapdots4, anchorX);
                } else {
                    this.drawOnMinimap(anchorY, this.mapdots3, anchorX);
                }
            }
        }

        if (this.hintType != 0 && this.loopCycle % 20 < 10) {
            if (this.hintType == 1 && this.hintNpc >= 0 && this.hintNpc < this.npc.length) {
                const npc = this.npc[this.hintNpc];

                if (npc != null) {
                    let x = ((npc.x / 32) | 0) - ((this.localPlayer.x / 32) | 0);
                    let y = ((npc.z / 32) | 0) - ((this.localPlayer.z / 32) | 0);
                    this.drawMinimapHint(x, y, this.mapmarker2);
                }
            } else if (this.hintType == 2) {
                const x = (this.hintTileX - this.mapBuildBaseX) * 4 + 2 - ((this.localPlayer.x / 32) | 0);
                const y = (this.hintTileZ - this.mapBuildBaseZ) * 4 + 2 - ((this.localPlayer.z / 32) | 0);
                this.drawMinimapHint(x, y, this.mapmarker2);
            } else if (this.hintType == 10 && this.hintPlayer >= 0 && this.hintPlayer < this.players.length) {
                const player = this.players[this.hintPlayer];

                if (player != null) {
                    const x = ((player.x / 32) | 0) - ((this.localPlayer.x / 32) | 0);
                    const y = ((player.z / 32) | 0) - ((this.localPlayer.z / 32) | 0);
                    this.drawMinimapHint(x, y, this.mapmarker2);
                }
            }
        }

        if (this.flagTileX !== 0) {
            anchorX = ((this.flagTileX * 4) + 2) - ((this.localPlayer.x / 32) | 0);
            anchorY = ((this.flagTileZ * 4) + 2) - ((this.localPlayer.z / 32) | 0);
            this.drawOnMinimap(anchorY, this.mapmarker1, anchorX);
        }

        // the white square local player position in the center of the minimap.
        Pix2D.fillRect(97, 78, 3, 3, Colors.WHITE);

        this.areaViewport?.bind();
    }

    drawMinimapHint(dx: number, dy: number, image: Pix32 | null) {
        if (!image) {
            return;
        }

        const distance = dx * dx + dy * dy;
        if (distance <= 4225 || distance >= 90000) {
            this.drawOnMinimap(dy, image, dx);
            return;
        }

        const angle: number = (this.orbitCameraYaw + this.macroMinimapAngle) & 0x7ff;

        let sinAngle: number = Pix3D.sinTable[angle];
        let cosAngle: number = Pix3D.cosTable[angle];

        sinAngle = ((sinAngle * 256) / (this.macroMinimapZoom + 256)) | 0;
        cosAngle = ((cosAngle * 256) / (this.macroMinimapZoom + 256)) | 0;

        const x: number = (dy * sinAngle + dx * cosAngle) >> 16;
        const y: number = (dy * cosAngle - dx * sinAngle) >> 16;

        const var13 = Math.atan2(x, y);
        const var15 = (Math.sin(var13) * 63.0) | 0;
        const var16 = (Math.cos(var13) * 57.0) | 0;

        this.mapedge?.rotatePlotSprite(83 - var16 - 20, var13, 256, 15, 15, 20, 20, var15 + 94 + 4 - 10);
    }

    private drawOnMinimap(dy: number, image: Pix32 | null, dx: number): void {
        if (!image) {
            return;
        }

        const distance: number = dx * dx + dy * dy;
        if (distance > 6400) {
            return;
        }

        const angle: number = (this.orbitCameraYaw + this.macroMinimapAngle) & 0x7ff;

        let sinAngle: number = Pix3D.sinTable[angle];
        let cosAngle: number = Pix3D.cosTable[angle];

        sinAngle = ((sinAngle * 256) / (this.macroMinimapZoom + 256)) | 0;
        cosAngle = ((cosAngle * 256) / (this.macroMinimapZoom + 256)) | 0;

        const x: number = (dy * sinAngle + dx * cosAngle) >> 16;
        const y: number = (dy * cosAngle - dx * sinAngle) >> 16;

        if (distance > 2500 && this.mapback) {
            image.scanlinePlotSprite(x + 94 - ((image.owi / 2) | 0) + 4, 83 - y - ((image.ohi / 2) | 0) - 4, this.mapback);
        } else {
            image.plotSprite(x + 94 - ((image.owi / 2) | 0) + 4, 83 - y - ((image.ohi / 2) | 0) - 4);
        }
    }

    // jag::oldscape::Client::AddChat
    private addChat(type: number, text: string, sender: string): void {
        if (type === 0 && this.tutLayerId !== -1) {
            this.modalMessage = text;
            this.mouseClickButton = 0;
        }

        if (this.chatLayerId === -1) {
            this.redrawChatback = true;
        }

        for (let i: number = 99; i > 0; i--) {
            this.messageType[i] = this.messageType[i - 1];
            this.messageSender[i] = this.messageSender[i - 1];
            this.messageText[i] = this.messageText[i - 1];
        }

        this.messageType[0] = type;
        this.messageSender[0] = sender;
        this.messageText[0] = text;
    }

    // jag::oldscape::FriendSystem::IsFriend
    private isFriend(username: string | null): boolean {
        if (!username) {
            return false;
        }

        for (let i: number = 0; i < this.friendCount; i++) {
            if (username.toLowerCase() === this.friendName[i]?.toLowerCase()) {
                return true;
            }
        }

        if (!this.localPlayer) {
            return false;
        }

        return username.toLowerCase() === this.localPlayer.name?.toLowerCase();
    }

    // jag::oldscape::FriendSystem::AddFriend
    private addFriend(username: bigint): void {
        if (username === 0n) {
            return;
        }

        if (this.friendCount >= 100 && this.membersAccount != 1) {
            this.addChat(0, 'Your friendlist is full. Max of 100 for free users, and 200 for members', '');
            return;
        } else if (this.friendCount >= 200) {
            this.addChat(0, 'Your friendlist is full. Max of 100 for free users, and 200 for members', '');
            return;
        }

        const displayName: string = JString.formatName(JString.fromBase37(username));
        for (let i: number = 0; i < this.friendCount; i++) {
            if (this.friendName37[i] === username) {
                this.addChat(0, displayName + ' is already on your friend list', '');
                return;
            }
        }

        for (let i: number = 0; i < this.ignoreCount; i++) {
            if (this.ignoreName37[i] === username) {
                this.addChat(0, 'Please remove ' + displayName + ' from your ignore list first', '');
                return;
            }
        }

        if (!this.localPlayer || !this.localPlayer.name) {
            return;
        }

        if (displayName !== this.localPlayer.name) {
            this.friendName[this.friendCount] = displayName;
            this.friendName37[this.friendCount] = username;
            this.friendWorld[this.friendCount] = 0;
            this.friendCount++;

            this.redrawSidebar = true;

            this.out.pIsaac(ClientProt.FRIENDLIST_ADD);
            this.out.p8(username);
        }
    }

    // jag::oldscape::FriendSystem::DelFriend
    private delFriend(username: bigint): void {
        if (username === 0n) {
            return;
        }

        for (let i: number = 0; i < this.friendCount; i++) {
            if (this.friendName37[i] === username) {
                this.friendCount--;
                this.redrawSidebar = true;

                for (let j: number = i; j < this.friendCount; j++) {
                    this.friendName[j] = this.friendName[j + 1];
                    this.friendWorld[j] = this.friendWorld[j + 1];
                    this.friendName37[j] = this.friendName37[j + 1];
                }

                this.out.pIsaac(ClientProt.FRIENDLIST_DEL);
                this.out.p8(username);
                return;
            }
        }
    }

    // jag::oldscape::FriendSystem::AddIgnore
    private addIgnore(username: bigint): void {
        if (username === 0n) {
            return;
        }

        if (this.ignoreCount >= 100) {
            this.addChat(0, 'Your ignore list is full. Max of 100 hit', '');
            return;
        }

        const displayName: string = JString.formatName(JString.fromBase37(username));
        for (let i: number = 0; i < this.ignoreCount; i++) {
            if (this.ignoreName37[i] === username) {
                this.addChat(0, displayName + ' is already on your ignore list', '');
                return;
            }
        }

        for (let i: number = 0; i < this.friendCount; i++) {
            if (this.friendName37[i] === username) {
                this.addChat(0, 'Please remove ' + displayName + ' from your friend list first', '');
                return;
            }
        }

        this.ignoreName37[this.ignoreCount++] = username;
        this.redrawSidebar = true;

        this.out.pIsaac(ClientProt.IGNORELIST_ADD);
        this.out.p8(username);
    }

    // jag::oldscape::FriendSystem::DelIgnore
    private delIgnore(username: bigint): void {
        if (username === 0n) {
            return;
        }

        for (let i: number = 0; i < this.ignoreCount; i++) {
            if (this.ignoreName37[i] === username) {
                this.ignoreCount--;
                this.redrawSidebar = true;

                for (let j: number = i; j < this.ignoreCount; j++) {
                    this.ignoreName37[j] = this.ignoreName37[j + 1];
                }

                this.out.pIsaac(ClientProt.IGNORELIST_DEL);
                this.out.p8(username);
                return;
            }
        }
    }

    private unloadTitle(): void {
        this.flameActive = false;

        if (this.flamesInterval) {
            clearInterval(this.flamesInterval);
            this.flamesInterval = null;
        }

        this.imageTitlebox = null;
        this.imageTitlebutton = null;
        this.imageRunes = [];

        this.flameGradient = null;
        this.flameGradient0 = null;
        this.flameGradient1 = null;
        this.flameGradient2 = null;

        this.flameBuffer0 = null;
        this.flameBuffer1 = null;
        this.flameBuffer3 = null;
        this.flameBuffer2 = null;

        this.imageFlamesLeft = null;
        this.imageFlamesRight = null;
    }

    // jag::oldscape::TitleFlames::RenderFlames
    renderFlames(): void {
        if (!this.flameActive) {
            return;
        }

        this.flameCycle++;

        // runs every ~40ms so update twice to compensate
        this.updateFlames();
        this.updateFlames();
        this.drawFlames();
    }

    // jag::oldscape::TitleFlames::UpdateFlames
    private updateFlames(): void {
        if (!this.flameBuffer3 || !this.flameBuffer2 || !this.flameBuffer0 || !this.flameLineOffset) {
            return;
        }

        const height: number = 256;

        for (let x: number = 10; x < 117; x++) {
            const rand: number = (Math.random() * 100.0) | 0;
            if (rand < 50) this.flameBuffer3[x + ((height - 2) << 7)] = 255;
        }

        for (let l: number = 0; l < 100; l++) {
            const x: number = ((Math.random() * 124.0) | 0) + 2;
            const y: number = ((Math.random() * 128.0) | 0) + 128;
            const index: number = x + (y << 7);
            this.flameBuffer3[index] = 192;
        }

        for (let y: number = 1; y < height - 1; y++) {
            for (let x: number = 1; x < 127; x++) {
                const index: number = x + (y << 7);
                this.flameBuffer2[index] = ((this.flameBuffer3[index - 1] + this.flameBuffer3[index + 1] + this.flameBuffer3[index - 128] + this.flameBuffer3[index + 128]) / 4) | 0;
            }
        }

        this.flameCycle0 += 128;
        if (this.flameCycle0 > this.flameBuffer0.length) {
            this.flameCycle0 -= this.flameBuffer0.length;
            this.generateFlameCoolingMap(this.imageRunes[(Math.random() * 12.0) | 0]);
        }

        for (let y: number = 1; y < height - 1; y++) {
            for (let x: number = 1; x < 127; x++) {
                const index: number = x + (y << 7);
                let intensity: number = this.flameBuffer2[index + 128] - ((this.flameBuffer0[(index + this.flameCycle0) & (this.flameBuffer0.length - 1)] / 5) | 0);
                if (intensity < 0) {
                    intensity = 0;
                }
                this.flameBuffer3[index] = intensity;
            }
        }

        for (let y: number = 0; y < height - 1; y++) {
            this.flameLineOffset[y] = this.flameLineOffset[y + 1];
        }

        this.flameLineOffset[height - 1] = (Math.sin(this.loopCycle / 14.0) * 16.0 + Math.sin(this.loopCycle / 15.0) * 14.0 + Math.sin(this.loopCycle / 16.0) * 12.0) | 0;

        if (this.flameGradientCycle0 > 0) {
            this.flameGradientCycle0 -= 4;
        }

        if (this.flameGradientCycle1 > 0) {
            this.flameGradientCycle1 -= 4;
        }

        if (this.flameGradientCycle0 === 0 && this.flameGradientCycle1 === 0) {
            const rand: number = (Math.random() * 2000.0) | 0;

            if (rand === 0) {
                this.flameGradientCycle0 = 1024;
            } else if (rand === 1) {
                this.flameGradientCycle1 = 1024;
            }
        }
    }

    // jag::oldscape::TitleFlames::GenerateFlameCoolingMap
    private generateFlameCoolingMap(image: Pix8 | null): void {
        if (!this.flameBuffer0 || !this.flameBuffer1) {
            return;
        }

        const flameHeight: number = 256;

        // Clears the initial flame buffer
        this.flameBuffer0.fill(0);

        // Blends the fire at random
        for (let i: number = 0; i < 5000; i++) {
            const rand: number = (Math.random() * 128.0 * flameHeight) | 0;
            this.flameBuffer0[rand] = (Math.random() * 256.0) | 0;
        }

        // changes color between last few flames
        for (let i: number = 0; i < 20; i++) {
            for (let y: number = 1; y < flameHeight - 1; y++) {
                for (let x: number = 1; x < 127; x++) {
                    const index: number = x + (y << 7);
                    this.flameBuffer1[index] = ((this.flameBuffer0[index - 1] + this.flameBuffer0[index + 1] + this.flameBuffer0[index - 128] + this.flameBuffer0[index + 128]) / 4) | 0;
                }
            }

            const last: Int32Array = this.flameBuffer0;
            this.flameBuffer0 = this.flameBuffer1;
            this.flameBuffer1 = last;
        }

        // Renders the rune images
        if (image) {
            let off: number = 0;

            for (let y: number = 0; y < image.hi; y++) {
                for (let x: number = 0; x < image.wi; x++) {
                    if (image.data[off++] !== 0) {
                        const x0: number = x + image.xof + 16;
                        const y0: number = y + image.yof + 16;
                        const index: number = x0 + (y0 << 7);
                        this.flameBuffer0[index] = 0;
                    }
                }
            }
        }
    }

    // jag::oldscape::TitleFlames::DrawFlames
    private drawFlames(): void {
        if (!this.flameGradient || !this.flameGradient0 || !this.flameGradient1 || !this.flameGradient2 || !this.flameLineOffset || !this.flameBuffer3) {
            return;
        }

        const height: number = 256;

        // just colors
        if (this.flameGradientCycle0 > 0) {
            for (let i: number = 0; i < 256; i++) {
                if (this.flameGradientCycle0 > 768) {
                    this.flameGradient[i] = this.titleFlamesMerge(this.flameGradient0[i], 1024 - this.flameGradientCycle0, this.flameGradient1[i]);
                } else if (this.flameGradientCycle0 > 256) {
                    this.flameGradient[i] = this.flameGradient1[i];
                } else {
                    this.flameGradient[i] = this.titleFlamesMerge(this.flameGradient1[i], 256 - this.flameGradientCycle0, this.flameGradient0[i]);
                }
            }
        } else if (this.flameGradientCycle1 > 0) {
            for (let i: number = 0; i < 256; i++) {
                if (this.flameGradientCycle1 > 768) {
                    this.flameGradient[i] = this.titleFlamesMerge(this.flameGradient0[i], 1024 - this.flameGradientCycle1, this.flameGradient2[i]);
                } else if (this.flameGradientCycle1 > 256) {
                    this.flameGradient[i] = this.flameGradient2[i];
                } else {
                    this.flameGradient[i] = this.titleFlamesMerge(this.flameGradient2[i], 256 - this.flameGradientCycle1, this.flameGradient0[i]);
                }
            }
        } else {
            for (let i: number = 0; i < 256; i++) {
                this.flameGradient[i] = this.flameGradient0[i];
            }
        }

        for (let i: number = 0; i < 33920; i++) {
            if (this.imageTitle0 && this.imageFlamesLeft) this.imageTitle0.data[i] = this.imageFlamesLeft.data[i];
        }

        let srcOffset: number = 0;
        let dstOffset: number = 1152;

        for (let y: number = 1; y < height - 1; y++) {
            const offset: number = ((this.flameLineOffset[y] * (height - y)) / height) | 0;

            let step: number = offset + 22;
            if (step < 0) {
                step = 0;
            }

            srcOffset += step;

            for (let x: number = step; x < 128; x++) {
                let value: number = this.flameBuffer3[srcOffset++];
                if (value === 0) {
                    dstOffset++;
                } else {
                    const alpha: number = value;
                    const invAlpha: number = 256 - value;
                    value = this.flameGradient[value];

                    if (this.imageTitle0) {
                        const background: number = this.imageTitle0.data[dstOffset];
                        this.imageTitle0.data[dstOffset++] = ((((value & 0xff00ff) * alpha + (background & 0xff00ff) * invAlpha) & 0xff00ff00) + (((value & 0xff00) * alpha + (background & 0xff00) * invAlpha) & 0xff0000)) >> 8;
                    }
                }
            }
            dstOffset += step;
        }

        this.imageTitle0?.draw(0, 0);

        for (let i: number = 0; i < 33920; i++) {
            if (this.imageTitle1 && this.imageFlamesRight) {
                this.imageTitle1.data[i] = this.imageFlamesRight.data[i];
            }
        }

        srcOffset = 0;
        dstOffset = 1176;

        for (let y: number = 1; y < height - 1; y++) {
            const offset: number = ((this.flameLineOffset[y] * (height - y)) / height) | 0;

            const step: number = 103 - offset;
            dstOffset += offset;

            for (let x: number = 0; x < step; x++) {
                let value: number = this.flameBuffer3[srcOffset++];
                if (value === 0) {
                    dstOffset++;
                } else {
                    const alpha: number = value;
                    const invAlpha: number = 256 - value;
                    value = this.flameGradient[value];

                    if (this.imageTitle1) {
                        const background: number = this.imageTitle1.data[dstOffset];
                        this.imageTitle1.data[dstOffset++] = ((((value & 0xff00ff) * alpha + (background & 0xff00ff) * invAlpha) & 0xff00ff00) + (((value & 0xff00) * alpha + (background & 0xff00) * invAlpha) & 0xff0000)) >> 8;
                    }
                }
            }

            srcOffset += 128 - step;
            dstOffset += 128 - step - offset;
        }

        this.imageTitle1?.draw(637, 0);

        if (this.isMobile) {
            MobileKeyboard.draw();
        }
    }

    // jag::oldscape::TitleFlames::Merge
    private titleFlamesMerge(src: number, alpha: number, dst: number): number {
        const invAlpha: number = 256 - alpha;
        return ((((src & 0xff00ff) * invAlpha + (dst & 0xff00ff) * alpha) & 0xff00ff00) + (((src & 0xff00) * invAlpha + (dst & 0xff00) * alpha) & 0xff0000)) >> 8;
    }

    // ----

    getTitleScreenState(): number {
        return this.loginscreen;
    }

    isChatBackInputOpen(): boolean {
        return this.chatbackInputOpen;
    }

    isShowSocialInput(): boolean {
        return this.showSocialInput;
    }

    getChatInterfaceId(): number {
        return this.chatLayerId;
    }

    getViewportInterfaceId(): number {
        return this.mainLayerId;
    }

    getReportAbuseInterfaceId(): number {
        // custom: for report abuse input on mobile
        return this.reportAbuseLayerId;
    }
}
