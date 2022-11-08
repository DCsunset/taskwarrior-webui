import { TaskwarriorLib } from 'taskwarrior-lib';

const taskRc = process.env.TASKRC;
const taskData = process.env.TASKDATA;

const taskwarrior = new TaskwarriorLib(taskRc, taskData);

export default taskwarrior;
