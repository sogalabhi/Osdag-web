import psycopg
from psycopg import sql

#########################################################
# Author : Atharva Pingale ( FOSSEE Summer Fellow '23 ) #
#########################################################


conn = psycopg.connect(dbname='postgres_Intg_osdag', host='localhost',
                        user='osdagdeveloper', password='osdag', port='5434')
cursor = conn.cursor()
file = open("ResourceFiles/Database/postgres_Intg_osdag.sql", "r+")

data = file.read()

cursor.execute(data)
print('SUCCESS : Database Populated')





