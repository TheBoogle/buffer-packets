import type { GenericPacketDefinition } from "./PacketList";
import { Players, RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import { IBufferPacketType, IBasePacket, EPacketReliability } from "./BufferTypes";

let RemotesFolder = script?.FindFirstChild("Remotes") as Folder;

if (!RemotesFolder) {
	if (!RunService.IsServer()) {
		throw "RemotesFolder is not defined.";
	}
	RemotesFolder = new Instance("Folder");
	RemotesFolder.Name = "Remotes";
	RemotesFolder.Parent = script;
}

export class PacketRuntime<T extends IBufferPacketType> implements IBasePacket<T> {
	public RemoteEvent: RemoteEvent | UnreliableRemoteEvent;

	public constructor(
		public readonly Name: string,
		public readonly Definition: GenericPacketDefinition,
	) {
		this.RemoteEvent = this.CreateRemote();
	}

	private GetRemote(): RemoteEvent {
		return this.RemoteEvent as RemoteEvent;
	}

	public Fire(PlayerOrPacket: Player | T, Packet?: T): void {
		if (RunService.IsServer()) {
			const Serialized = this.Definition.Serialize(Packet as never);
			this.GetRemote().FireClient(PlayerOrPacket as Player, Serialized);
		} else {
			const Serialized = this.Definition.Serialize(PlayerOrPacket as never);
			this.GetRemote().FireServer(Serialized);
		}
	}

	public FireAll(Packet: T): void {
		if (RunService.IsServer()) {
			const Serialized = this.Definition.Serialize(Packet as never);

			this.GetRemote().FireAllClients(Serialized);
		}
	}

	public FireAllExcept(Player: Player, Packet: T): void {
		if (RunService.IsServer()) {
			const Serialized = this.Definition.Serialize(Packet as never);

			Players.GetPlayers().forEach((OtherPlayer) => {
				if (OtherPlayer !== Player) {
					this.GetRemote().FireClient(OtherPlayer, Serialized);
				}
			});
		}
	}

	private InternalOnPacketReceived<T extends IBufferPacketType>(ReceivedPacket: unknown): T {
		if (!t.buffer(ReceivedPacket)) {
			throw `PacketRuntime.InternalOnPacketReceived: Received invalid packet type for ${this.Name}`;
		}

		const Deserialized = this.Definition.Deserialize(ReceivedPacket) as T;

		return Deserialized;
	}

	private BindToEvent(
		Signal: RBXScriptSignal<(PlayerOrPacket: Player | buffer, ...Args: unknown[]) => void>,
		Callback: (PlayerOrPacket: Player | T, Packet?: T) => void,
	): RBXScriptConnection {
		return Signal.Connect((PlayerOrPacket, ...Args) => {
			const IsServer = RunService.IsServer();

			const RawData = IsServer ? Args[0] : PlayerOrPacket;
			const Packet = this.InternalOnPacketReceived(RawData) as T;

			if (IsServer) {
				Callback(PlayerOrPacket as Player, Packet);
			} else {
				Callback(Packet);
			}
		});
	}

	public OnPacketReceived(Callback: (PlayerOrPacket: Player | T, Packet?: T) => void): RBXScriptConnection {
		if (RunService.IsServer()) {
			return this.BindToEvent(this.GetRemote().OnServerEvent, Callback);
		} else {
			return this.BindToEvent(this.GetRemote().OnClientEvent, Callback);
		}
	}

	private CreateRemote(): RemoteEvent | UnreliableRemoteEvent {
		const Name = this.Name;
		const Existing = RemotesFolder.FindFirstChild(Name);

		const ExpectedClass =
			this.Definition.Reliability === EPacketReliability.Unreliable ? "UnreliableRemoteEvent" : "RemoteEvent";

		if (Existing?.IsA(ExpectedClass)) return Existing as RemoteEvent;

		if (RunService.IsClient()) {
			throw `Cannot create remote event on client: ${Name} with type ${ExpectedClass}`;
		}

		const Remote = new Instance(ExpectedClass);
		Remote.Name = Name;
		Remote.Parent = RemotesFolder;
		return Remote as RemoteEvent;
	}
}
