import sys
import json

from pycparser import c_ast # type:ignore
from centipyde import interpret, c_values

from get_coordinates import get_coordinates

def process(args):
    if isinstance(args, dict):
        for i in args:
            args[i] = process(args[i])
    if isinstance(args, (tuple, list)):
        args = list(args)
        for i in range(len(args)):
            args[i] = process(args[i])
    elif isinstance(args, (bytearray, bytes)):
        # can't just decode the string, because it goes wrong if they screwed up their strings
        args = list(args)
    elif isinstance(args, Val):
        args = args.to_dict()
        args['value'] = process(args['value'])
    elif isinstance(args, (Address, Flow)):
        args = args.to_dict()
    elif isinstance(args, Memory):
        args = args.to_dict()
        args['array'] = process(args['array'])
    return args

class Unbuffered(object):
   def __init__(self, stream):
       self.stream = stream
   def write(self, data):
       self.stream.write(data)
       self.stream.flush()
   def writelines(self, datas):
       self.stream.writelines(datas)
       self.stream.flush()
   def __getattr__(self, attr):
       return getattr(self.stream, attr)

# TODO: unsure if this is necessary
sys.stdout = Unbuffered(sys.stdout) # type:ignore

json_in = sys.stdin.readline()
code = json.loads(json_in)
assert 'code' in code
interpreter = interpret.init_interpreter(code['code'], True)
interpreter.run()
coords = get_coordinates(interpreter.ast)
#interpreter.ast.show(showcoord=True)
interpreter.setup_main(code['argv'], code['stdin'])
response = json.dumps({'success': True, 'type': 'load code'})
# TODO: need to add newlines, and then make sure that the server waits for newlines, to make sure full message is
# received??
print(response)

for line in sys.stdin:
    cmd = json.loads(line)
    if cmd['cmd'] == 'next':
        output = interpreter.step()
        if isinstance(output, c_ast.Node):
            output = {
                'type': 'node_visit',
                'args': {
                    'node': output.__class__.__name__,
                    'coords': coords[output]
                }
            }
        elif output is None:
            ret = interpreter.k.get_passthrough(0)
            output = {
                'type': 'exit',
                'args': ret.value
            }
        else:
            output = {
                'type': output[0],
                'args': process(output[1:])
            }
        print(json.dumps({'type': 'cmd', 'success': True, 'output': output}))
