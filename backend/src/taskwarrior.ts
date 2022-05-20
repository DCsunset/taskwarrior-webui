import { TaskwarriorLib } from 'taskwarrior-lib';
import * as path from 'path';

const prod = process.env.NODE_ENV === 'production';
const taskRc = process.env.TASKRC || (prod ? '/.taskrc' : path.join(__dirname, '../test/.taskrc'));
const taskData = process.env.TASKDATA || (prod ? '/.task' : path.join(__dirname, '../test/.task'));

const taskwarrior = new TaskwarriorLib(taskRc, taskData);

export default taskwarrior;
