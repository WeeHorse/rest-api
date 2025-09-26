import {readFileSync} from "fs"

const accessList = JSON.parse(
  readFileSync(new URL("./access-list.json", import.meta.url))
)

// access control list middleware
export default function acl(request, response, next){

  const userRoles = ["*"]
  const sessionRole = request.session?.user?.role
  if(sessionRole){
    userRoles.push(sessionRole)
  }else{
    userRoles.push("anonymous")
  }

  for(const route of accessList){

    if(route.url === request.path){
      for(const access of route.accesses){
        // matching the intersection between two arrays
        if(userRoles.some(userRole => access.roles.includes(userRole)) 
          && access.methods.includes(request.method)){
          // call next now that we have access rights
          return next()
        }
      }
    }

  }

  return response.status(403).json({message:"Access forbidden"})

}