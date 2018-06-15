import sys
import json

from pycparser import c_ast
from centipyde.centipyde import interpret
from centipyde.centipyde.values import *

from get_coordinates import get_coordinates

def process(args):
    if isinstance(args, (tuple, list)):
        args = list(args)
        for i in range(len(args)):
            args[i] = process(args[i])
    elif isinstance(args, (bytearray, bytes)):
        # TODO: goes wrong if they screwed up their strings...
        args = args.decode('latin-1')
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

# unsure if this is necessary
sys.stdout = Unbuffered(sys.stdout)

code = sys.stdin.readline()
code = json.loads(code)
assert 'code' in code
interpreter = interpret.init_interpreter(code['code'], True)
interpreter.run()
coords = get_coordinates(interpreter.ast)
interpreter.setup_main(code['argv'], code['stdin'])
response = json.dumps({'success': True, 'status': 'interpreter loaded code'})
print(response + "\n\n")

for line in sys.stdin:
    cmd = json.loads(line)
    if cmd['cmd'] == 'next':
        output = interpreter.step()
        if isinstance(output, c_ast.Node):
            output = {
                'type': 'node-visit',
                'node': output.__class__.__name__,
                'coords': coords[output]
            }
        else:
            output = {
                'type': output[0],
                'args': process(output[1:])
            }

        #output = str(output)
        if output is None:
            ret = interpreter.k.get_passthrough(0)
            print(json.dumps({'success': True, 'returncode': ret.value}))
        print(json.dumps({'success': True, 'output': output}))
