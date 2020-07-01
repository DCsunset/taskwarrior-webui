import { TaskwarriorLib } from 'taskwarrior-lib';
import * as path from 'path';

const prod = process.env.NODE_ENV === 'production';

const taskwarrior = new TaskwarriorLib(
	prod ? '~/.taskrc' : path.join(__dirname, '../test/.taskrc'),
	prod ? '~/.task' : path.join(__dirname, '../test/.task'),
);

export default taskwarrior;
