import { TaskwarriorLib } from 'taskwarrior-lib';

const taskRc = process.env.TASKRC;
const taskData = process.env.TASKDATA;

const taskwarrior = new TaskwarriorLib(taskRc, taskData);

// Ensure all Taskwarrior invocations suppress colors and terminal line wrapping,
// preventing themes, ANSI escape sequences, or width wrapping from corrupting JSON parsing.
const originalExecuteCommand = taskwarrior.executeCommand.bind(taskwarrior);
taskwarrior.executeCommand = function (args: string = '', input?: string): string {
	const safeArgs = `rc._forcecolor=off rc.defaultwidth=0 ${args}`.trim();
	return originalExecuteCommand(safeArgs, input);
};

export default taskwarrior;
